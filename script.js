document.getElementById('speed').addEventListener('input', updateClipDuration);
document.getElementById('startTime').addEventListener('input', updateClipDuration);
document.getElementById('endTime').addEventListener('input', updateClipDuration);

function updateClipDuration() {
    const startTime = convertTimeToSeconds(document.getElementById('startTime').value);
    const endTime = convertTimeToSeconds(document.getElementById('endTime').value);
    const speed = parseFloat(document.getElementById('speed').value);
    console.log('startTime is ' + startTime)
    console.log('endTime is ' + endTime)
    console.log('speed is ' + speed)

    if (!isNaN(startTime) && !isNaN(endTime) && !isNaN(speed) && speed > 0) {
        const duration = (endTime - startTime) / speed;
        document.getElementById('clipDuration').innerText = `Clip Duration: ${duration.toFixed(2)} seconds`;
    } else {
        document.getElementById('clipDuration').innerText = '';
    }
}

function processAudio() {
    const ytLink = document.getElementById('ytLink').value;
    const startTime = convertTimeToSeconds(document.getElementById('startTime').value);
    const endTime = convertTimeToSeconds(document.getElementById('endTime').value);
    const numClips = document.getElementById('numClips').value;
    const clipGap = document.getElementById('clipGap').value;
    const speed = document.getElementById('speed').value;
    const fileName = document.getElementById('fileName').value;

    fetch('/process-audio', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            url: ytLink, 
            startTime: parseInt(startTime), 
            endTime: parseInt(endTime), 
            numClips: parseInt(numClips),
            clipGap: parseFloat(clipGap),
            speed: parseFloat(speed),
            fileName: fileName
        })
    }).then(response => {
        if (response.ok) {
            response.blob().then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = fileName ? `${fileName}.mp3` : 'output_audio.mp3';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            });
        } else {
            alert('Failed to process audio.');
        }
    }).catch(error => {
        console.error('Error:', error);
        alert('Error processing audio.');
    });
}

function convertTimeToSeconds(timeString) {
    const parts = timeString.split(':');
    if (parts.length === 2) {
        const minutes = parseInt(parts[0]);
        const seconds = parseInt(parts[1]);
        return (minutes * 60) + seconds;
    } else {
        return 0; // Handle error or invalid format appropriately
    }
}
