var fs = require('fs')

module.exports =  class ExplorerOsu {
    debug

    Osu_path
    Songs_path

    SongsDir
    SongsDirLength

    currentFolderNum
    checkingSubSongsPath
    checkingfile

    canDoMainLoop = true

    constructor(path,Songs){
        this.debug = 0;
        this.Osu_path = path;
        this.Songs_path = Songs;
    }

    Prepare(){
        if (this.debug) console.log("Prepairing..")
        return
    }

    MainLoop(){
        if (this.debug) console.log("Starting Main Loop..")
        for (let SubSongsFolder of this.SongsDir){

            if (this.debug) console.log("Start Cheching Sub Folder..")
            this.StartCheckingSubSongs();

            this.currentFolderNum++;
            if (this.debug) console.log(this.currentFolderNum+" of "+this.SongsDirLength)

            this.checkingSubSongsPath = this.Songs_path+'\\'+SubSongsFolder;
		   	let checkingDir = fs.lstatSync(this.checkingSubSongsPath)
            if (checkingDir.isDirectory()){                

                let CurrentCheckingDir = fs.readdirSync(this.checkingSubSongsPath, function(err, result) {
                    if(err) console.log('error', err);
                  })

                for (this.checkingfile of CurrentCheckingDir){

                    this.CheckFileFullPath = this.checkingSubSongsPath+"\\"+this.checkingfile;
                    if (this.debug) console.log("Start Cheching File in Sub Folder..")
                    this.checkFileSubSongs();

                }

                if (this.debug) console.log("End Cheching Sub Folder..")
                this.endCheckSubSongs();
            }
        }
        return
    }

    StartCheckingSubSongs(){
        return
    }

    checkFileSubSongs(){
        return
    }

    endCheckSubSongs(){
        return
    }

    AfterLoop(){
        return
    }

    Explore(){
        this.currentFolderNum = 0;
		try{ 
		  	this.SongsDir = fs.readdirSync(this.Songs_path, function(err, result) {
                if(err) console.log('error', err);
              })
            if (this.debug) 
                console.log (this.SongsDir)
		} catch (e) {
			if (e.code === 'ENOENT'){
				console.log ("Incorrect path to Songs");
			} else {
                console.log(e)
            }

			return
		}

        this.SongsDirLength = this.SongsDir.length

        this.Prepare();

        if (this.canDoMainLoop == 1 || this.canDoMainLoop == true)
            this.MainLoop();

        this.AfterLoop();

        return
    }

};