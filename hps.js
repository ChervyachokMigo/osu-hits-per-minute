var log = console.log.bind(console)
var fs = require('fs').promises
var path = require('path')

var exceljs = require('exceljs')
var sqlite3 = require('sqlite3').verbose()

var progress = require('./progress-bar.js')
var config = require('./config.js')

var db 

function CreateTable(){
	db.run('CREATE TABLE "BeatmapsAll" ('+
		'"BeatmapSetID"	INTEGER,'+
		'"BeatmapID" INTEGER,'+
		'"BeatmapMapper"	TEXT,'+
		'"BeatmapArtist"	TEXT,'+
		'"BeatmapTitle"	TEXT,'+
		'"BeatmapDiff"	TEXT,'+
		'"MapPath"	INTEGER,'+
		'"BeatmapDuration"	REAL,'+
		'"HitObjects"	INTEGER,'+
		'"HitsPerMinute"	NUMERIC,'+
		'"HitsRate"	NUMERIC,'+
		'"AimRate" NUMERIC,'+
		'"MapLink"	TEXT,'+
		'"osudirect"	TEXT)')
}

function insertRows(data) {
	let placeholders =  data.map((dataarray) => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');

	data = [].concat(...data)
    db.run('INSERT INTO "BeatmapsAll" VALUES '+ placeholders,
    	data)
}

function getPropery(data){
	var res = data.split(":")
	return res[1].trim()
}

function getLink(text,url){
	return '<a href="'+url+'">'+text+'</a>'
}

function pointsLength(x1,y1,x2,y2){
	let res = Math.sqrt( ((x2-x1)**2) + ((y2-y1)**2) )
	return res
}

var hps = {

	ScaningSongs: async function(){
		var SongsDir
		try{
		  	SongsDir = await fs.readdir(config.Songspath);
		}catch(errorSongsPath){
			if (errorSongsPath.code === 'ENOENT'){
				log ("Incorrect path to Songs")
			}
			return
		}

		var itemnum = 0
	  	

	  	var MapsFiles = []
		MapsFiles.length = 0

///////////////////////////////////////////

		if (config.CreateXlsx == 1){
			var workbook = new exceljs.Workbook();

			var worksheet = workbook.addWorksheet('Sheet1');
			var linkStyle = {
			  underline: true,
			  color: { argb: 'FF0000FF' },
			};
			var defaultText = {
			  underline: false,
			  color: { argb: '00000000' },
			};
		worksheet.columns = [
			  {header: 'BeatmapSetID', key: 'BeatmapSetID'},
			  {header: 'BeatmapID', key: 'BeatmapID'},
			  {header: 'BeatmapMapper', key: 'BeatmapMapper'},
			  {header: 'BeatmapArtist', key: 'BeatmapArtist'},
			  {header: 'BeatmapTitle', key: 'BeatmapTitle'},
			  {header: 'BeatmapDiff', key: 'BeatmapDiff'},
			  {header: 'MapPath', key: 'MapPath'},
			  {header: 'BeatmapDuration', key: 'BeatmapDuration'},
	  		  {header: 'HitObjects', key: 'HitObjects'},
	  		  {header: 'HitsPerMinute', key: 'HitsPerMinute'},
	  		  {header: 'HitsRate', key: 'HitsRate'},
	  		  {header: 'AimRate', key: 'AimRate'},
	  		  //{header:'osu!direct',key:'osudirect'}
	  		  {header:'MapLink',key:'MapLink'}
			]
			worksheet.columns.forEach(column => {
			  column.width = column.header.length < 12 ? 12 : column.header.length
			})
			worksheet.getRow(1).font = {bold: true}

			const figureColumnsNumbers = [1, 2, 7]
			figureColumnsNumbers.forEach((i) => {
			  worksheet.getColumn(i).numFmt = '0'
			  worksheet.getColumn(i).alignment = {horizontal: 'right'}
			})

			const figureColumnsFloat = [8]
			figureColumnsFloat.forEach((i) => {
			  worksheet.getColumn(i).numFmt = '0.000000'
			  worksheet.getColumn(i).alignment = {horizontal: 'right'}
			})

			const figureColumnsLink = [12]
			figureColumnsLink.forEach((i) => {
				worksheet.getColumn(i).font = linkStyle;
			})
			worksheet.getCell('L1').font = {color: {argb: "00000000"},bold: true};
		} 

		var isDBexists = 0
		var isXlsxExists = 0
		try {
			await fs.access('BeatmapsHPM.db', fs.F_OK)
			isDBexists = 1
		} catch (e){
			config.ForceCreateDB = 1
		}
		try {
			await fs.access('BeatmapDB.xlsx', fs.F_OK)
			isXlsxExists = 1
		} catch (e){}


		if (config.ForceCreateDB == 1){
			if (isDBexists == 1){
				await fs.rename('BeatmapsHPM.db','BeatmapsHPM.db.bak')
			}
			db = new sqlite3.Database('BeatmapsHPM.db')
			CreateTable()
		}

		let printtasks = []
		if (isDBexists == 0 || config.ForceCreateDB == 1 || config.CreateXlsx == 1)
			printtasks.push('scaning Songs')
		if (isDBexists == 0 || config.ForceCreateDB == 1)
			printtasks.push('creating Beatmaps DB')
		if (config.CreateXlsx == 1)
			printtasks.push('writing xlsx of Beatmaps DB')

		await progress.setDefault(SongsDir.length,printtasks)

////////////////////////////////////////////////////
		var rowsfordb = []
		rowsfordb.length = 0
		if (isDBexists == 0 || config.ForceCreateDB == 1 || config.CreateXlsx == 1){
		  	for (const folder of SongsDir){

	 			progress.print()
	 			
				itemnum++

				let filePathTemp = (config.Songspath+'\\'+folder).replace(/\/+/g, '\\').replace(/\\+/g, '\\')
		   	 	let fileTemp = await fs.lstat(filePathTemp)

		   		if (fileTemp.isDirectory()){

		   			const DirTemp = await fs.readdir(filePathTemp)

		   			for (const checkingfile of DirTemp){
			   			
		   				if (path.extname(checkingfile)=='.osu'){

		   					let tempdata = await fs.readFile((filePathTemp+"\\"+checkingfile).replace(/\/+/g, '\\').replace(/\\+/g, '\\'),'utf8')
			   				tempdata = tempdata.toString().split("\n")

			   				let beatmapdata = {id:"0",setid:"-2",diff:"",title:"",artist:"",mapper:"",hitsRate:0,HPM:-1,duration:0, numobjects:0,aimRate:0}
			   				let averageOffetObj = {previous: -1, current: 1, first: 0, last: 0, jumplength: 0, jumpprevious: 0}

			   				let HitObjectsFind = 0

		   					for(let i in tempdata) {

		   						if(tempdata[i].startsWith("BeatmapID:") ){
									beatmapdata.id = getPropery(tempdata[i])
								}
								if(tempdata[i].startsWith("BeatmapSetID:") ){
									beatmapdata.setid = getPropery(tempdata[i])
								}
								if(tempdata[i].startsWith("Version:") ){
									beatmapdata.diff = getPropery(tempdata[i])
								}
								if(tempdata[i].startsWith("Title:") ){
									beatmapdata.title = getPropery(tempdata[i])
								}
								if(tempdata[i].startsWith("Artist:") ){
									beatmapdata.artist = getPropery(tempdata[i])
								}
								if(tempdata[i].startsWith("Creator:") ){
									beatmapdata.mapper = getPropery(tempdata[i])
								}
								

			   					if (HitObjectsFind == 1 && tempdata[i].startsWith("[")== true ){
									HitObjectsFind = 0
								}

								if (tempdata[i].toLowerCase().startsWith("[hitobjects]") == true ){
									HitObjectsFind = 1

								}
								if (HitObjectsFind == 1){

									averageOffetObj = this.getAverageOffset(averageOffetObj, tempdata[i])
									beatmapdata.numobjects++
								}
							}

							averageOffetObj.last = averageOffetObj.previous

							let filepathmap=folder+"\\"+checkingfile

							beatmapdata.hitsRate =  beatmapdata.numobjects/(averageOffetObj.current)
							beatmapdata.aimRate = beatmapdata.numobjects/(averageOffetObj.jumplength)*1000

							if (beatmapdata.id>0){
								if (config.CreateXlsx == 1){
									var maplink_direct = { 
										text: "link",
										hyperlink: "osu://b/"+beatmapdata.id
									}
									var maplink = {
										text: "link",
										hyperlink: "https://osu.ppy.sh/beatmapsets/"+beatmapdata.setid
									}
								} 
								if (config.ForceCreateDB == 1){
									var maplink_direct =  "osu://b/"+beatmapdata.id
									var maplink =  "https://osu.ppy.sh/beatmapsets/"+beatmapdata.setid+"#osu/"+beatmapdata.id
								}
								
							} else {
								var maplink_direct = "no link"
								var maplink = "no link"
							}

							beatmapdata.duration = (averageOffetObj.last - averageOffetObj.first)/1000

							if (beatmapdata.duration > 0){
								beatmapdata.HPM = beatmapdata.numobjects/(beatmapdata.duration/60)
							} 

							var objmap = {
								BeatmapSetID: Number(beatmapdata.setid),
								BeatmapID: Number(beatmapdata.id),
								BeatmapMapper: beatmapdata.mapper,
								BeatmapArtist: beatmapdata.artist,
								BeatmapTitle: beatmapdata.title,
								BeatmapDiff: beatmapdata.diff,
								MapPath: '',//filepathmap,
								BeatmapDuration: beatmapdata.duration,
								HitObjects: Number(beatmapdata.numobjects),
								HitsPerMinute: beatmapdata.HPM,
								HitsRate: Number(beatmapdata.hitsRate).toFixed(6),
								AimRate: Number(beatmapdata.aimRate).toFixed(6),
								MapLink: maplink,
								osudirect: maplink_direct
							}

							if (config.CreateXlsx == 1){
								var LastRow = worksheet.addRow(objmap);

								if (maplink_direct === "no link"){
									LastRow.getCell(12).font = defaultText
								}
								if (maplink === "no link"){
									LastRow.getCell(12).font = defaultText
								}
							}
							if (config.ForceCreateDB == 1){
								if ( objmap.BeatmapID>0 && objmap.BeatmapSetID>0 && objmap.BeatmapDuration>0){
									
										rowsfordb.push(
											[objmap.BeatmapSetID,
									    	objmap.BeatmapID,
									    	objmap.BeatmapMapper,
									    	objmap.BeatmapArtist,
									    	objmap.BeatmapTitle,
									    	objmap.BeatmapDiff,
									    	objmap.MapPath,
									    	objmap.BeatmapDuration,
									    	objmap.HitObjects,
									    	objmap.HitsPerMinute,
									    	objmap.HitsRate,
									    	objmap.AimRate,
									    	objmap.MapLink,
									    	objmap.osudirect]
									    )
									
									
								}
							}

		   				}//end .osu file

		   			}//end every file

		   		}//end folder

		   		if (config.ForceCreateDB == 1){
			   		if (itemnum%75==0 || itemnum == SongsDir.length){
			   			try{
							insertRows(rowsfordb)
						}catch (e){
							log(e)
						}
						rowsfordb = []
						rowsfordb.length = 0
			   		}
			   	}

		   	}//end songs

			

		   if (config.CreateXlsx == 1){
		   	await workbook.xlsx.writeFile('BeatmapDB.xlsx');
		   }
		   if (config.ForceCreateDB == 1){
		   	db.close();
		   }
		}

	},//end run

	getAverageOffset: function(avgOffset, data){

		let tempdata_hitobject = data.split(',')


		let hitobject_cors = {x:Number(tempdata_hitobject[0]),y:Number(tempdata_hitobject[1])}

		if (!isNaN(hitobject_cors.x) && !isNaN(hitobject_cors.y)){
			if (avgOffset.jumpprevious != 0){
				let res = pointsLength(hitobject_cors.x,hitobject_cors.y, avgOffset.jumpprevious.x, avgOffset.jumpprevious.y)
				if (!isNaN(res)){
					avgOffset.jumplength = avgOffset.jumplength + res
				}
			}
			avgOffset.jumpprevious = hitobject_cors
		}


		let hitobject_offset = Number(tempdata_hitobject[2])
		
		if (Number(hitobject_offset)>0){
			if (avgOffset.previous != -1) {
				let hitobjects_range = hitobject_offset - avgOffset.previous
				if (hitobjects_range>1000){
					hitobjects_range = avgOffset.current
				}
				avgOffset.current = (avgOffset.current + hitobjects_range) / 2
			} else {
				avgOffset.first = hitobject_offset
			}
			avgOffset.previous = hitobject_offset

		}

		return avgOffset
	},

	GetBeatmap: async function(){
		let header = '<!DOCTYPE HTML><html><head><meta charset="utf-8"><link rel="stylesheet" href="hps_style.css"><title>'+config.expr+' LIMIT '+config.limit+' ORDER BY '+config.order+'</title></head><body>'
		header += '<script src="hps_functions.js"></script>'+
		'<audio id="audio" src="" preload="none"></audio>'
		let footer =  '</body></html>'
		db = new sqlite3.Database('BeatmapsHPM.db')

		await fs.writeFile('beatmapsQueryResult.html', header)//clear

		let exprHtml = '<div style="display: flex;color:#fff;">'+config.expr+' LIMIT '+config.limit+' ORDER BY '+config.order+'</div>'

		await fs.appendFile('beatmapsQueryResult.html',exprHtml)

		let num = 1;

		await db.each ('SELECT * FROM (SELECT * FROM "BeatmapsAll" WHERE '+config.expr+' ORDER BY RANDOM() ASC LIMIT '+config.limit+') ORDER BY '+config.order,(e,row)=>{
			if (e){throw e}
				if (num==1){
					fs.appendFile('beatmapsQueryResult.html','<div class="beatmaps_container">')
				}
			if (num%2){
				fs.appendFile('beatmapsQueryResult.html','<div class="beatmap_contentrow">')
			}
			let DurationSec = row.BeatmapDuration.toFixed(0)%60
			let DurationMin = (row.BeatmapDuration.toFixed(0)/60).toFixed(0)
			let content = '<div class="beatmap_content">' + 
			'<div class="beatmap_play_button">' + 
			'<div class="playButton" onclick="playAudio('+row.BeatmapSetID+')"><img class="play_bg" src="https://assets.ppy.sh/beatmaps/'+row.BeatmapSetID+'/covers/list.jpg" ><img class="play_play" src="play.png"></div>'+
			'</div>' + 
			'<a href='+row.MapLink+'><div class="beatmap_info">' + 
			'<div class="beatmap_title" title="'+row.BeatmapTitle+'">'+row.BeatmapTitle+'</div>'+
			'<div class="beatmap_artist" title="'+row.BeatmapArtist+'">'+row.BeatmapArtist+'</div>'+
			'<div class="beatmap_diff"  title="'+row.BeatmapDiff+'">['+row.BeatmapDiff+']</div>'+
			'<div class="beatmap_mapper" title="'+row.BeatmapMapper+'">сделана '+row.BeatmapMapper+'</div></a>'+
			'<div class="beatmap_parameters">'+
			'<div class="beatmap_duration" title="Duration">'+DurationMin+':'+DurationSec+'</div>'+
			'<div class="beatmap_hitobjects" title="Hit objects">'+row.HitObjects+'</div>'+
			'<div class="beatmap_hpm" title="Hits per minute">'+row.HitsPerMinute.toFixed(0)+'</div>'+
			'<div class="beatmap_hitsrate" title="Hits rate">'+row.HitsRate+'</div>'+
			'<div class="beatmap_aimrate" title="Aim rate">'+row.AimRate+'</div>'+
			'<div class="osudirect"><a href="'+row.osudirect+'">osu!direct</a></div>'+
			'</div></div></div>'

			fs.appendFile('beatmapsQueryResult.html',content)
			num++

			if (num%2 || db.length === num){
				fs.appendFile('beatmapsQueryResult.html','</div>')
			}

		})

		await fs.appendFile('beatmapsQueryResult.html',footer)
		await db.close();

	}//end getbeatmap

}

main = async function(){

	
	await hps.ScaningSongs()
	
	await hps.GetBeatmap()

}
main()