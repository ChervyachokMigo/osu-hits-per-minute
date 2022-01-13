module.exports = {

	Songspath:  'F:\\Songs',			//your songs folder with back slashes

	ForceCreateDB: 0,	//1 - scanning songs and create db
	CreateXlsx: 0,	//1 - create xlsx excel file with all maps

	//mysql expretion
	//parameters:
	/*
		BeatmapSetID
		BeatmapID
		BeatmapMapper
		BeatmapArtist
		BeatmapTitle
		BeatmapDiff
		BeatmapDuration
		HitObjects
		HitsPerMinute
		HitsRate
	*/
	expr : 'HitsRate<89',
	//'1=1',
	//'BeatmapTitle LIKE "%Wings (Nu%" or BeatmapTitle LIKE "%wizard\'s tower%" or BeatmapTitle LIKE "%louder than steel%"',

	//number show objects
	limit: 200,

	order: 'HitsRate ASC',
}
