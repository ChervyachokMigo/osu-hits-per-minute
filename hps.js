var log = console.log.bind(console)
var fs = require('fs').promises
var path = require('path')
//const xlsx = require("xlsx")
var spread_sheet = require('spread_sheet');
var exceljs = require('exceljs')
var mp3Duration = require('mp3-duration');
const mm = require('music-metadata');
const util = require('util');

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

		//worksheet.autoFilter = 'G1:H1';
////////////////////////////////////////////////////


	  	for (const folder of SongsDir){

 			PrintProgress(SongsDir.length,itemnum,1)
			itemnum++

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
										hps_averageOffset = (hps_averageOffset + hps_range) / 2
									}
									hps_previous = tempdata_hitobject_offset
									HitObjects++
								}
							}
						}

						let filepathmap=folder+"\\"+checkingfile

						hps_hitsRate =  HitObjects/(hps_averageOffset)

						if (tempdata_beatmapid>0){
							var maplink = { 
								text: "link",
								hyperlink: "osu://b/"+tempdata_beatmapid
							}
							var maplink2 = {
								text: "link",
								hyperlink: "https://osu.ppy.sh/beatmapsets/"+tempdata_beatmapsetid
							}
						} else {
							var maplink = "no link"
							var maplink2 = "no link"
						}
						var BeatmapDuration = -1
						try{
							var metadata = await mm.parseFile(beatmapAudioPath)
							BeatmapDuration = metadata.format.duration
						} catch (e){}


						var hps_hpm = -1
						if (BeatmapDuration > 0){
							hps_hpm = HitObjects/(BeatmapDuration/60)
						} 

						var LastRow = worksheet.addRow({
							BeatmapSetID: Number(tempdata_beatmapsetid),
							BeatmapID: Number(tempdata_beatmapid),
							BeatmapMapper: tempdata_mapper,
							BeatmapArtist: tempdata_artist,
							BeatmapTitle: tempdata_title,
							BeatmapDiff: tempdata_diff,
							MapPath: filepathmap,
							BeatmapDuration: BeatmapDuration,
							HitObjects: Number(HitObjects),
							HitsPerMinute: hps_hpm,
							HitsRate: Number(hps_hitsRate).toFixed(6),
							//osudirect: maplink
							MapLink: maplink2
						});

						if (maplink === "no link"){
							LastRow.getCell(12).font = defaultText
						}
						if (maplink2 === "no link"){
							LastRow.getCell(12).font = defaultText
						}

	   				}//end .osu file

	   			}//end every file

	   		}//end folder

	   		//if (itemnum==300){break}

	   	}//end songs

	    await workbook.xlsx.writeFile('BeatmapDB.xlsx');

	},//end run

	test: async function(){
		const workbook = new exceljs.Workbook();

		const worksheet = workbook.addWorksheet('Sheet1');
		const linkStyle = {
		  underline: true,
		  color: { argb: 'FF0000FF' },
		};
	worksheet.columns = [
		  {header: 'BeatmapSetID', key: 'BeatmapSetID'},
		  {header: 'BeatmapID', key: 'BeatmapID'},
		  {header: 'BeatmapArtist', key: 'BeatmapArtist'},
		  {header: 'BeatmapTitle', key: 'BeatmapTitle'},
		  {header: 'BeatmapDiff', key: 'BeatmapDiff'},
		  {header: 'MapPath', key: 'MapPath'},
  		  {header: 'HitObjects', key: 'HitObjects'},
  		  {header: 'HitsRate', key: 'HitsRate'},
  		  {header:'osu!direct',key:'osudirect'}
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

		const figureColumnsLink = [9]
		figureColumnsLink.forEach((i) => {
			  worksheet.getColumn(i).font = linkStyle;
		})
		worksheet.getCell('I1').font = {color: {argb: "00000000"},bold: true};

		worksheet.autoFilter = 'G1:H1';

		worksheet.addRow({
			BeatmapSetID:634339,
			BeatmapID:1345997,
			BeatmapArtist:"t+pazolite Remix",
			BeatmapTitle:"Singletap training",
			BeatmapDiff:"300 BPM stack",
			MapPath:"634339 t+pazolite Remix - Singletap training\\t+pazolite Remix - Singletap training (ImCayne) [300 BPM stack].osu",
			HitObjects:100,
			HitsRate:1.000000,
			osudirect:{ 
				text: '300 BPM stack',
				hyperlink: 'osu://b/1345997'
			}
		});

		worksheet.addRow({
			BeatmapSetID:634339,
			BeatmapID:1345997,
			BeatmapArtist:"t+pazolite Remix",
			BeatmapTitle:"Singletap training",
			BeatmapDiff:"300 BPM stack",
			MapPath:"634339 t+pazolite Remix - Singletap training\\t+pazolite Remix - Singletap training (ImCayne) [300 BPM stack].osu",
			HitObjects:100,
			HitsRate: Number("0.5003007").toFixed(6),
			osudirect:{ 
				text: '300 BPM stack',
				hyperlink: 'osu://b/1345997'
			}
		});

		


		await workbook.xlsx.writeFile('test123.xlsx');
	}

}

main = async function(){

	return (await hps.CreateDB())
	//return (await hps.test())
}
main()