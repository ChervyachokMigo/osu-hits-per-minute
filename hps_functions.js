function playAudio(id){
	var audio = document.getElementById('audio');
    audio.src='https://b.ppy.sh/preview/'+id+'.mp3';
    audio.play();
}