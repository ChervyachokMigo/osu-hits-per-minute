module.exports = {

	Songspath:  'F:\\Songs',			//your songs folder with back slashes

	CreateDB: 0,	//1 - scanning songs and create db
	//OR
	CreateXlsx: 0,	//1 - create xlsx excel file with all maps, not compatible with previous option

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
	limit: 1000,

	order: 'HitsRate ASC',
}
