var log = console.log.bind(console)
var fs = require('fs').promises
var path = require('path')
//const xlsx = require("xlsx")
var spread_sheet = require('spread_sheet');
var exceljs = require('exceljs')
const mm = require('music-metadata');
const util = require('util');
var sqlite3 = require('sqlite3').verbose();
var db 

var CreateDB = 0
var CreateXlsx = 0
var expr = 'HitsRate>0.9 AND HitsRate<1 AND BeatmapDuration>200 AND BeatmapDuration<300 AND HitsPerMinute<120 AND HitsPerMinute>100'
var limit = 1000000
var order = 'HitsRate ASC'

var progressbar, progressbar_empty

function ProgressBarDefault(){
	progressbar = ""
	progressbar_empty = "__________"
}

function PrintProcents(procent){

	if ((procent*10 % 100) < 1){
		progressbar_empty = progressbar_empty.substring(0, progressbar_empty.length - 1);
		progressbar = progressbar + "█"
	}
	log ("╔══════════╗")
	log ("║"+progressbar+progressbar_empty+"║")
	log ("╚══════════╝")
	log (procent + "% ")
}

function PrintProgress(Length,num,task){
	if (num % (Length/1000) < 1 ){
		process.stdout.write('\033c');
		let itemnumproc = Math.trunc(num / Length * 1000) / 10
		log ("[Tasks]")
		log("Writing xlsx of Beatmaps DB")
		log ("")
		log ("Processing...")
		PrintProcents(itemnumproc)
	}
}

function CreateTable(){
	db.run('CREATE TABLE "BeatmapsAll" ("BeatmapSetID"	INTEGER,"BeatmapID" INTEGER,	"BeatmapMapper"	TEXT,"BeatmapArtist"	TEXT,	"BeatmapTitle"	TEXT,	"BeatmapDiff"	TEXT,	"MapPath"	INTEGER,	"BeatmapDuration"	REAL,	"HitObjects"	INTEGER,	"HitsPerMinute"	NUMERIC,	"HitsRate"	NUMERIC,	"MapLink"	TEXT,	"osudirect"	TEXT)')
}

function insertRows(data) {
	let placeholders =  data.map((dataarray) => '(?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');

	data = [].concat(...data)
    db.run('INSERT INTO "BeatmapsAll" VALUES '+ placeholders,
    	data)
    
}


var hps = {
	//путь к папке Songs (обратный слеш в пути экранируется еще одним - \\ )
	Songspath: 'F:\\Songs',

	CreateDB: async function(){
		var SongsDir
		try{
		  	SongsDir = await fs.readdir(this.Songspath);
		}catch(errorSongsPath){
			if (errorSongsPath.code === 'ENOENT'){
				log ("Incorrect path to Songs")
			}
			return
		}

		var itemnum = 0
	  	ProgressBarDefault()

	  	var MapsFiles = []
		MapsFiles.length = 0

///////////////////////////////////////////

		if (CreateXlsx == 1){
			const workbook = new exceljs.Workbook();

			const worksheet = workbook.addWorksheet('Sheet1');
			const linkStyle = {
			  underline: true,
			  color: { argb: 'FF0000FF' },
			};
			const defaultText = {
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
		} else {
			db = new sqlite3.Database('BeatmapsHPM.db')
			CreateTable()

		}

////////////////////////////////////////////////////
		var rowsfordb = []
		rowsfordb.length = 0
	  	for (const folder of SongsDir){

 			PrintProgress(SongsDir.length,itemnum,1)
 			
			itemnum++
			//log (itemnum+'/'+SongsDir.length)

			var filePathTemp = (this.Songspath+'\\'+folder).replace(/\/+/g, '\\').replace(/\\+/g, '\\')
	   	 	var fileTemp = await fs.lstat(filePathTemp)

	   		if (fileTemp.isDirectory()){
	   			const DirTemp = await fs.readdir(filePathTemp)
	   			for (const checkingfile of DirTemp){
		   			
	   				if (path.extname(checkingfile)=='.osu'){
	   					let tempdata = await fs.readFile((filePathTemp+"\\"+checkingfile).replace(/\/+/g, '\\').replace(/\\+/g, '\\'),'utf8')
		   				tempdata = tempdata.toString().split("\n")
		   				let tempdata_beatmapid = "0"
		   				let tempdata_beatmapsetid = "-2"
		   				let tempdata_diff = ""
		   				let tempdata_title = ""
		   				let tempdata_artist = ""
		   				let hps_previous = -1
		   				let hps_averageOffset = 1
		   				let hps_nis = 0
		   				let HitObjectsFind = 0
		   				let HitObjects = 0
		   				let hps_hitOffsetFirst = 0
		   				let hps_hitOffsetLast = 0
	   					for(let i in tempdata) {
	   						if(tempdata[i].startsWith("AudioFilename:") ){
								tempdata_beatmapAudio = tempdata[i].split(":")
								tempdata_beatmapAudio =  tempdata_beatmapAudio[1].trim()
								var beatmapAudioPath = filePathTemp+"\\"+tempdata_beatmapAudio

							}
	   						if(tempdata[i].startsWith("BeatmapID:") ){
								tempdata_beatmapid = tempdata[i].split(":")
								tempdata_beatmapid =  tempdata_beatmapid[1].trim()

							}
							if(tempdata[i].startsWith("BeatmapSetID:") ){
								tempdata_beatmapsetid = tempdata[i].split(":")
								tempdata_beatmapsetid =  tempdata_beatmapsetid[1].trim()
							}
							if(tempdata[i].startsWith("Version:") ){
								tempdata_diff = tempdata[i].split(":")
								tempdata_diff =  tempdata_diff[1].trim()
							}
							if(tempdata[i].startsWith("Title:") ){
								tempdata_title = tempdata[i].split(":")
								tempdata_title  =  tempdata_title[1].trim()
							}
							if(tempdata[i].startsWith("Artist:") ){
								tempdata_artist = tempdata[i].split(":")
								tempdata_artist  =  tempdata_artist[1].trim()
							}
							if(tempdata[i].startsWith("Creator:") ){
								tempdata_mapper = tempdata[i].split(":")
								tempdata_mapper  =  tempdata_mapper[1].trim()
							}
							

		   					if (HitObjectsFind == 1 && tempdata[i].startsWith("[")== true ){
								HitObjectsFind = 0
							}

							if (tempdata[i].toLowerCase().startsWith("[hitobjects]") == true ){
								HitObjectsFind = 1

							}
							if (HitObjectsFind == 1){
								let tempdata_hitobject = tempdata[i].split(',')

								let tempdata_hitobject_offset = Number(tempdata_hitobject[2])
								
								if (Number(tempdata_hitobject_offset)>0){
									if (hps_previous != -1) {
										let hps_range = tempdata_hitobject_offset - hps_previous
										if (hps_range>5000){
											hps_range = hps_averageOffset
										}
										hps_averageOffset = (hps_averageOffset + hps_range) / 2
									} else {
										hps_hitOffsetFirst = tempdata_hitobject_offset
									}
									hps_previous = tempdata_hitobject_offset
									HitObjects++
								}
							}
						}

						hps_hitOffsetLast = hps_previous

						let filepathmap=folder+"\\"+checkingfile

						hps_hitsRate =  HitObjects/(hps_averageOffset)

						if (tempdata_beatmapid>0){
							if (CreateXlsx == 1){
								var maplink = { 
									text: "link",
									hyperlink: "osu://b/"+tempdata_beatmapid
								}
								var maplink2 = {
									text: "link",
									hyperlink: "https://osu.ppy.sh/beatmapsets/"+tempdata_beatmapsetid
								}
							} else {

								var maplink =  "osu://b/"+tempdata_beatmapid
								
								var maplink2 =  "https://osu.ppy.sh/beatmapsets/"+tempdata_beatmapsetid+"#osu/"+tempdata_beatmapid
							}
							
						} else {
							var maplink = "no link"
							var maplink2 = "no link"
						}

						var BeatmapDuration = -1
						try{
							//var metadata = await mm.parseFile(beatmapAudioPath)
							//BeatmapDuration = metadata.format.duration
							BeatmapDuration = (hps_hitOffsetLast - hps_hitOffsetFirst )/1000
						} catch (e){}

						var hps_hpm = -1
						if (BeatmapDuration > 0){
							hps_hpm = HitObjects/(BeatmapDuration/60)
						} 

						var objmap = {
							BeatmapSetID: Number(tempdata_beatmapsetid),
							BeatmapID: Number(tempdata_beatmapid),
							BeatmapMapper: tempdata_mapper,
							BeatmapArtist: tempdata_artist,
							BeatmapTitle: tempdata_title,
							BeatmapDiff: tempdata_diff,
							MapPath: '',//filepathmap,
							BeatmapDuration: BeatmapDuration,
							HitObjects: Number(HitObjects),
							HitsPerMinute: hps_hpm,
							HitsRate: Number(hps_hitsRate).toFixed(6),
							MapLink: maplink2,
							osudirect: maplink
						}

						if (CreateXlsx == 1){
							var LastRow = worksheet.addRow(objmap);

							if (maplink === "no link"){
								LastRow.getCell(12).font = defaultText
							}
							if (maplink2 === "no link"){
								LastRow.getCell(12).font = defaultText
							}
						} else {
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
								    	objmap.MapLink,
								    	objmap.osudirect]
								    )
								
								
							}
						}

	   				}//end .osu file

	   			}//end every file

	   		}//end folder

	   		if (itemnum%75==0 || itemnum == SongsDir.length){
	   			try{
					insertRows(rowsfordb)
				}catch (e){
					log(e)
				}
				rowsfordb = []
				rowsfordb.length = 0
	   		}

	   	}//end songs

		

	   if (CreateXlsx == 1){
	   	await workbook.xlsx.writeFile('BeatmapDB.xlsx');
	   } else {
	   	db.close();
	   }

	},//end run

	GetBeatmap: async function(){
		db = new sqlite3.Database('BeatmapsHPM.db')

		await fs.writeFile('beatmapsQueryResult.html','')//clear

		let exprHtml = '<div style="display: flex;">'+expr+' LIMIT '+limit+' ORDER BY '+order+'</div>'

		await fs.appendFile('beatmapsQueryResult.html',exprHtml)

		let headcontent = '<div style="display: flex;">' + 
			getTableCeil('Audio',125) +
			getTableCeil('BeatmapTitle',250) +
			getTableCeil('BeatmapArtist',200) +
			getTableCeil('BeatmapDiff',300) +
			getTableCeil('BeatmapMapper',125) +			
			getTableCeil('Duration',100) +
			getTableCeil('HitObjects',100) +
			getTableCeil('HitsPerMinute',100) +
			getTableCeil('HitsRate',100) +
			getTableCeil('Map link') +
			getTableCeil('osu!direct') +'</div>'

		await fs.appendFile('beatmapsQueryResult.html',headcontent)

		db.each ('SELECT * FROM (SELECT * FROM "BeatmapsAll" WHERE '+expr+' ORDER BY RANDOM() ASC LIMIT '+limit+') ORDER BY '+order,(e,row)=>{
			if (e){
				throw e
			}

			let content = '<div style="display: flex;">' + 
			getTableCeil('<audio controls style="width:125;height:25;" preload="none"><source src="https://b.ppy.sh/preview/'+row.BeatmapSetID+'.mp3" type="audio/mpeg"></audio>',125)+
			getTableCeil(row.BeatmapTitle,250) +
			getTableCeil(row.BeatmapArtist,200) +
			getTableCeil(row.BeatmapDiff,300) +
			getTableCeil(row.BeatmapMapper,125) +
			getTableCeil((row.BeatmapDuration).toFixed(0),100) +
			getTableCeil(row.HitObjects,100) +
			getTableCeil(row.HitsPerMinute.toFixed(0),100) +
			getTableCeil(row.HitsRate,100) +
			getTableCeil(getLink('Map link',row.MapLink)) +
			getTableCeil(getLink('osu!direct',row.osudirect)) +'</div>'
//<img srcset="https://assets.ppy.sh/beatmaps/1619982/covers/list.jpg?1637326573 1x, https://assets.ppy.sh/beatmaps/1619982/covers/list@2x.jpg?1637326573 2x" class="beatmapset-panel__cover" src="https://assets.ppy.sh/beatmaps/1619982/covers/list.jpg?1637326573">
			fs.appendFile('beatmapsQueryResult.html',content)

		})
		
		db.close();

	}//end getbeatmap

}

function getTableCeil(data,width=0){
	if (width === 0){width = 'max-content'}
	return '<div style="width: '+width+';white-space: nowrap;display: block;margin:0;padding:2px;float:left;">'+data+'</div>'
}

function getLink(text,url){
	return '<a href="'+url+'">'+text+'</a>'
}

main = async function(){

	

	if (CreateDB == 1){
		return (await hps.CreateDB())
	} else {
		return (await hps.GetBeatmap())
	}

	
}
main()