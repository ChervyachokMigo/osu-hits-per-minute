const log = console.log.bind(console)

const fs = require('fs')
const path = require('path')

const exceljs = require('exceljs')
const sqlite3 = require('better-sqlite3')

const progress = require('./progress-bar.js')
const config = require('./config.js')
const ExplorerOsu = require("./ExplorerOsu.js")

class ExplorerOsuHPS extends ExplorerOsu {

	MapsFiles = []

	workbook
	worksheet
	WorksheetdefaultText

	isDBexists
	isXlsxExists

	db
	rowsfordb = []

	printTasks = []

	constructor(osupath,songspath){
		super(osupath,songspath)
		this.MapsFiles.length = 0
		this.rowsfordb.length = 0
		this.debug=0
	}

	PrepareXlsx(){
		this.workbook = new exceljs.Workbook();

		this.worksheet = this.workbook.addWorksheet('Sheet1');
		let linkStyle = {
			underline: true,
			color: { argb: 'FF0000FF' },
		};
		this.WorksheetdefaultText = {
			underline: false,
			color: { argb: '00000000' },
		};
		this.worksheet.columns = [
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
			{header:'MapLink',key:'MapLink'},
			{header:'ModDate',key:'ModDate'}
		]
		this.worksheet.columns.forEach(column => {
			column.width = column.header.length < 12 ? 12 : column.header.length
		})
		this.worksheet.getRow(1).font = {bold: true}

		const figureColumnsNumbers = [1, 2, 7]
		figureColumnsNumbers.forEach((i) => {
			this.worksheet.getColumn(i).numFmt = '0'
			this.worksheet.getColumn(i).alignment = {horizontal: 'right'}
		})

		const figureColumnsFloat = [8]
		figureColumnsFloat.forEach((i) => {
			this.worksheet.getColumn(i).numFmt = '0.000000'
			this.worksheet.getColumn(i).alignment = {horizontal: 'right'}
		})

		const figureColumnsLink = [12]
		figureColumnsLink.forEach((i) => {
			this.worksheet.getColumn(i).font = linkStyle;
		})
		this.worksheet.getCell('L1').font = {color: {argb: "00000000"},bold: true};

	}

	CheckExistsDBAndXlsx(){

		if (existsFile ('BeatmapsHPM.db')){
			this.isDBexists = 1
		} else {
			config.ForceCreateDB = 1
			this.isDBexists = 0
		}

		if (existsFile ('BeatmapDB.xlsx')){
			this.isXlsxExists = 1
		} else {
			this.isXlsxExists = 0
		}

	}

	BackupFile(file,n=1){
		if(existsFile(file+'.bak'+n)){
			this.BackupFile(file,n+1)
		} else {
			fs.renameSync(file,file+'.bak'+n)
		}
	}

	prepareSongsDB(){
		if (config.ForceCreateDB == 1){
			if (this.isDBexists == 1){
				this.BackupFile('BeatmapsHPM.db')
			}

			this.db = new sqlite3('BeatmapsHPM.db')
			
			let q = this.db.prepare('CREATE TABLE "BeatmapsAll" ('+
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
					'"osudirect"	TEXT,'+
					'"ModDate" INTEGER)')
			q.run()
			
		}
		
	}

	prepareTasks(){
		if (this.isDBexists == 0 || config.ForceCreateDB == 1 || config.CreateXlsx == 1)
			this.printTasks.push('scaning Songs')
		if (this.isDBexists == 0 || config.ForceCreateDB == 1)
			this.printTasks.push('creating Beatmaps DB')
		if (config.CreateXlsx == 1)
			this.printTasks.push('writing xlsx of Beatmaps DB')
	}

	Prepare(){
		if (config.CreateXlsx == 1) this.PrepareXlsx()
		this.CheckExistsDBAndXlsx()
		this.prepareSongsDB()
		this.prepareTasks()
		progress.setDefault(this.SongsDirLength,this.printTasks)
		if (this.isDBexists == 0 || config.ForceCreateDB == 1 || config.CreateXlsx == 1) {this.canDoMainLoop = true} else {this.canDoMainLoop = false}
	}

	StartCheckingSubSongs(){
		if (config.printingProgress){
			progress.print()
		}
    }

	createdDate (file) {  
		const {mtimeMs}  = fs.statSync(file)
		return new Date(mtimeMs).getFullYear()
	}

    checkFileSubSongs(){
		if (path.extname(this.checkingfile) !== '.osu'){
			return
		}
		
		

		let tempdata = fs.readFileSync(this.CheckFileFullPath,'utf8')
		
		tempdata = tempdata.toString().split("\n")

		let beatmapdata = {id:"0",setid:"-2",diff:"",title:"",artist:"",mapper:"",hitsRate:0,HPM:-1,duration:0, numobjects:0,aimRate:0,moddate:0}
		let NotesObj = {previous: -1, avgOffset: 1, first: 0, last: 0, jumplength: 0, jumpprevious: 0}

		let HitObjectsFind = 0

		if (config.MakeSongsByYearFolder){
			beatmapdata.moddate = this.createdDate(this.CheckFileFullPath)
		}

		//scanning osu file
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
				NotesObj = this.getAverageOffset(NotesObj, tempdata[i])
				beatmapdata.numobjects++
			}
		}

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

		NotesObj.last = NotesObj.previous

		beatmapdata.duration = (NotesObj.last - NotesObj.first)/1000

		if (beatmapdata.duration > 0){
			beatmapdata.HPM = beatmapdata.numobjects/(beatmapdata.duration/60)
		} 

		beatmapdata.hitsRate = beatmapdata.HPM/NotesObj.avgOffset
		beatmapdata.aimRate = beatmapdata.HPM*NotesObj.jumplength*0.000001

		var objmap = {
			BeatmapSetID: Number(beatmapdata.setid),
			BeatmapID: Number(beatmapdata.id),
			BeatmapMapper: beatmapdata.mapper,
			BeatmapArtist: beatmapdata.artist,
			BeatmapTitle: beatmapdata.title,
			BeatmapDiff: beatmapdata.diff,
			MapPath: '',//folder+"\\"+checkingfile,
			BeatmapDuration: beatmapdata.duration,
			HitObjects: Number(beatmapdata.numobjects),
			HitsPerMinute: beatmapdata.HPM,
			HitsRate: Number(beatmapdata.hitsRate).toFixed(3),
			AimRate: Number(beatmapdata.aimRate).toFixed(3),
			MapLink: maplink,
			osudirect: maplink_direct,
			ModDate: beatmapdata.moddate
		}

		if (config.CreateXlsx == 1){
			var LastRow = this.worksheet.addRow(objmap);

			if (maplink_direct === "no link"){
				LastRow.getCell(12).font = this.WorksheetdefaultText
			}
			if (maplink === "no link"){
				LastRow.getCell(12).font = this.WorksheetdefaultText
			}
		}
		if (config.ForceCreateDB == 1){
			if ( objmap.BeatmapID>0 && objmap.BeatmapSetID>0 && objmap.BeatmapDuration>0){
				this.rowsfordb.push(
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
					objmap.osudirect,
					objmap.ModDate]
				)

			}
		}

    }

	getAverageOffset (NotesObj, data){
		let tempdata_hitobject = data.split(',')

		let hitobject_cors = {x:Number(tempdata_hitobject[0]),y:Number(tempdata_hitobject[1])}

		if (!isNaN(hitobject_cors.x) && !isNaN(hitobject_cors.y)){
			if (NotesObj.jumpprevious != 0){
				let res = pointsLength(hitobject_cors.x,hitobject_cors.y, NotesObj.jumpprevious.x, NotesObj.jumpprevious.y)
				if (!isNaN(res)){
					NotesObj.jumplength = NotesObj.jumplength + res
				}
			}
			NotesObj.jumpprevious = hitobject_cors
		}

		let hitobject_offset = Number(tempdata_hitobject[2])
		
		if (Number(hitobject_offset)>0){
			if (NotesObj.previous != -1) {
				let hitobjects_range = hitobject_offset - NotesObj.previous
				if (hitobjects_range>1000){
					hitobjects_range = NotesObj.avgOffset
				}
				NotesObj.avgOffset = (NotesObj.avgOffset + hitobjects_range) / 2
			} else {
				NotesObj.first = hitobject_offset
			}
			NotesObj.previous = hitobject_offset
		}

		return NotesObj
	}

	insertRows(data) {
		let placeholders =  data.map((dataarray) => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
		data = [].concat(...data)
		let q = this.db.prepare('INSERT INTO "BeatmapsAll" VALUES '+ placeholders)
		q.run(data)		
	}

	StorePartsRowsDB(){
		if (this.currentFolderNum%75==0 || this.currentFolderNum == this.SongsDirLength){
			this.insertRows(this.rowsfordb)
			this.rowsfordb = []
			this.rowsfordb.length = 0
		}
	}

    endCheckSubSongs(){
		if (config.ForceCreateDB == 1){
			this.StorePartsRowsDB()
		}
    }

	AfterLoop(){
		if (config.CreateXlsx == 1){
			this.workbook.xlsx.writeFile('BeatmapDB.xlsx');
		}
		if (config.ForceCreateDB == 1){
			this.db.close();
		}
	}

	GetBeatmaps(){
		let header = '<!DOCTYPE HTML><html><head><meta charset="utf-8"><link rel="stylesheet" href="hps_style.css"><title>'+config.expr+' LIMIT '+config.limit+' ORDER BY '+config.order+'</title></head><body>'
		header += '<script src="hps_functions.js"></script>'+
		'<audio id="audio" src="" preload="none"></audio>'
		let footer =  '</body></html>'
		this.db = new sqlite3('BeatmapsHPM.db')

		fs.writeFileSync('beatmapsQueryResult.html', header)//clear

		let exprHtml = '<div style="display: flex;color:#fff;">'+config.expr+' LIMIT '+config.limit+' ORDER BY '+config.order+'</div>'

		fs.appendFileSync('beatmapsQueryResult.html',exprHtml)

		let num = 1;

		let q = this.db.prepare ('SELECT * FROM (SELECT * FROM "BeatmapsAll" WHERE '+config.expr+' ORDER BY RANDOM() ASC LIMIT '+config.limit+') ORDER BY '+config.order)
		let rows = q.all()
	
		rows.forEach( (row) => {
			if (num==1){
				fs.appendFileSync('beatmapsQueryResult.html','<div class="beatmaps_container">')
			}
			if (num%2){
				fs.appendFileSync('beatmapsQueryResult.html','<div class="beatmap_contentrow">')
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
			'<div class="beatmap_moddate" title="Modify Year">'+row.ModDate+'</div>'+
			'</div></div></div>'
	
			fs.appendFileSync('beatmapsQueryResult.html',content)
			num++
	
			if (num%2 || this.db.length === num){
				fs.appendFileSync('beatmapsQueryResult.html','</div>')
			}
		})		

		fs.appendFileSync('beatmapsQueryResult.html',footer)
		this.db.close();

	}

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

const existsFile = (file) => {
	try {
		fs.accessSync(file, fs.constants.F_OK | fs.constants.R_OK);
		return true;
	} catch (e) {
		return false;
	}
}


var explorer = new ExplorerOsuHPS("C:\\osu","F:\\Songs")
explorer.Explore()
explorer.GetBeatmaps()
