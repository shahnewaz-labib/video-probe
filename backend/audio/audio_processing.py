from openai import OpenAI
import os
import math
import base64
from pydub import AudioSegment

from moviepy.editor import VideoFileClip

from dotenv import load_dotenv

load_dotenv('../.env', override=True)
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)


def convert_mp4_to_mp3(mp4_file_path, mp3_file_path):
    video_clip = VideoFileClip(mp4_file_path)
    audio_clip = video_clip.audio
    audio_clip.write_audiofile(mp3_file_path)

# convert_mp4_to_mp3("../demo-videos/ted-x.mp4", "../temp/ted-x.mp3")
    
output_folder = "chunks"
num_chunks = -1

def chunk_file_by_size(file_name, chunk_size_bytes = 10 * 1024 * 1024):
    os.makedirs(output_folder, exist_ok=True)
    
    with open(file_name, 'rb') as file:
        file_size = os.path.getsize(file_name)
        num_chunks = (file_size + chunk_size_bytes -  1) // chunk_size_bytes
        for i in range(num_chunks):
            chunk_file_name = os.path.join(output_folder, f"{os.path.splitext(os.path.basename(file_name))[0]}_chunk{i}.mp3")
            chunk = file.read(chunk_size_bytes)
            with open(chunk_file_name, 'wb') as chunk_file:
                chunk_file.write(chunk)

    return num_chunks

# num_chunks = chunk_file_by_size(file_path, chunk_size_bytes, output_folder)

def transcribe_chunk(chunk_file):
    with open(chunk_file, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
            timestamp_granularities=["word"]
        )
    return transcription

def get_transcription(file_path, num_chunks):
    transcriptions = []
    
    for i in range(num_chunks):
        chunk_file_name = f"{os.path.splitext(os.path.basename(file_path))[0]}_chunk{i}.mp3"
        
        path = os.path.join(os.getcwd(), output_folder, chunk_file_name)
        transcription = transcribe_chunk(path)
        os.remove(path)

        transcriptions.append(transcription)

    return transcriptions

# transcriptions = get_transcription(file_path, num_chunks)

# response = client.chat.completions.create(
#   model="gpt-3.5-turbo-0125",
#   # response_format={ "type": "json_object" },
#   messages=[
#     {"role": "system", "content": "You are a helpful text summarizer assistant."},
#     {"role": "user", "content": "Summarize this in about 30 lines: " + transcriptions[0].text}
#   ]
# )
# print(response.choices[0].message.content)
def get_video_summary(file_path):
    mp3_file_path = os.path.join(os.getcwd(), "temp", f"{os.path.splitext(os.path.basename(file_path))[0]}.mp3")
    convert_mp4_to_mp3(file_path, mp3_file_path)
    num_chunks = chunk_file_by_size(mp3_file_path)
    transcriptions = get_transcription(mp3_file_path, num_chunks)
    response = client.chat.completions.create(
		model="gpt-3.5-turbo-0125",
		messages=[
			{"role": "system", "content": "You are a helpful text summarizer assistant."},
			{"role": "user", "content": "Summarize this in about 30 lines: " + transcriptions[0].text}
		]
	)
    return response.choices[0].message.content, transcriptions[0].text
