var log = console.log.bind(console)
module.exports = {
	itemsLength: 0,
	itemCurrent: 0,
	progressbar: '', 
	progressbar_empty: '',
	tasks: [],

	setDefault: function (itemsLength,tasks){
		this.progressbar = ""
		this.progressbar_empty = "__________"
		this.itemsLength = itemsLength
		this.tasks = tasks
		this.itemCurrent = 0
	},

	PrintProcents: function (procent){

		if ((procent*10 % 100) < 1){
			this.progressbar_empty = this.progressbar_empty.substring(0, this.progressbar_empty.length - 1);
			this.progressbar = this.progressbar + "█"
		}
		log ("╔══════════╗")
		log ("║"+this.progressbar+this.progressbar_empty+"║")
		log ("╚══════════╝")
		log (procent + "% ")
	},

	print: function(){
		if (this.itemCurrent % (this.itemsLength/1000) < 1 ){
			process.stdout.write('\033c');
			let itemsProcent = Math.trunc(this.itemCurrent / this.itemsLength * 1000) / 10
			log ("[Tasks]")
			for (let task of this.tasks){
				log (task)
			}
			log ("")
			log ("Processing...")
			this.PrintProcents(itemsProcent)
		}
		this.itemCurrent++
	}

}