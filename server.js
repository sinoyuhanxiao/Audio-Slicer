const express = require('express');
const bodyParser = require('body-parser');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { exec } = require('child_process');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/multiple_audios.html', (req, res) => {
    res.sendFile(__dirname + '/multiple_audios.html');
});

app.get('/warmups_generator.html', (req, res) => {
    res.sendFile(__dirname + '/warmups_generator.html');
});

app.post('/process-audio', async (req, res) => {
    const { url, startTime, endTime, numClips, clipGap, speed, fileName } = req.body;
    const clipDuration = (endTime - startTime) / speed;
    const silenceDuration = clipDuration + clipGap; // Calculate the duration for silence according to user input
    const baseFileName = `audio_${Date.now()}`;
    const tempFileName = `${baseFileName}.mp3`;
    const clipFileName = `${baseFileName}_clip.mp3`;
    const outputFileName = `${baseFileName}_output.mp3`;
    const silenceFileName = `${baseFileName}_silence.mp3`; // Dynamic silence file name

    const videoStream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' });
    const writer = fs.createWriteStream(tempFileName);
    videoStream.pipe(writer);
    console.log('clipDuration is ' + clipDuration)

    writer.on('finish', () => {
        ffmpeg(tempFileName)
            .setStartTime(startTime)
            .duration(clipDuration)
            .audioCodec('libmp3lame')
            .audioFilters(`atempo=${speed}`)
            .format('mp3')
            .save(clipFileName)
            .on('end', () => {
                const silenceCommand = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${silenceDuration} -q:a 9 ${silenceFileName}`;
                exec(silenceCommand, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error generating silence: ${error.message}`);
                        res.status(500).send('Failed to generate silence');
                        return;
                    }
                    concatenateClips(tempFileName, clipFileName, silenceFileName, outputFileName, numClips, res);
                });
            })
            .on('error', (error) => {
                console.error('Error processing clip:', error);
                res.status(500).send('Failed to process clip');
            });
    });

    writer.on('error', (error) => {
        console.error('Download error:', error);
        res.status(500).send('Failed to download video');
    });
});

function concatenateClips(tempFileName, clipFileName, silenceFileName, outputFileName, numClips, res) {
    let ffmpegCommand = ffmpeg();

    for (let i = 0; i < numClips; i++) {
        ffmpegCommand = ffmpegCommand.input(clipFileName);
        if (i < numClips - 1) {
            ffmpegCommand = ffmpegCommand.input(silenceFileName);
        }
    }

    let complexFilter = [];
    for (let i = 0; i < numClips; i++) {
        complexFilter.push(`[${i * 2}:a]`); // Correct index for clips
        if (i < numClips - 1) {
            complexFilter.push(`[${i * 2 + 1}:a]`); // Correct index for silences
        }
    }
    complexFilter = complexFilter.join('') + `concat=n=${numClips * 2 - 1}:v=0:a=1[aout]`;

    ffmpegCommand
        .complexFilter(complexFilter, 'aout')
        .output(outputFileName)
        .on('end', () => {
            res.download(outputFileName, () => {
                fs.unlinkSync(tempFileName);  // Clean up the base file
                fs.unlinkSync(clipFileName);  // Clean up clip file
                fs.unlinkSync(silenceFileName);  // Clean up silence file
                fs.unlinkSync(outputFileName);  // Clean up output file
            });
            console.log('Audio concatenation complete.');
        })
        .on('error', (error) => {
            console.error('Error during ffmpeg processing:', error);
            res.status(500).send('Failed to concatenate audio');
        })
        .run();
}

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
