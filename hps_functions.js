function playAudio(id){
	var audio = document.getElementById('audio');
    if (audio.src == 'https://b.ppy.sh/preview/'+id+'.mp3'){
        if (audio.paused){
            audio.play();
        }else{
            audio.pause()
        }
    }else{
        audio.src='https://b.ppy.sh/preview/'+id+'.mp3';
        audio.play();
    }
    
    
}