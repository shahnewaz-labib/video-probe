import cv2  # We're using OpenCV to read video, to install !pip install opencv-python
import base64
import time
from openai import OpenAI
import os
import requests
from dotenv import load_dotenv

load_dotenv('../.env', override=True)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

def get_video_frames(video_path):
	video = cv2.VideoCapture(video_path)
	base64Frames = []
	while video.isOpened():
		success, frame = video.read()
		if not success:
			break
		_, buffer = cv2.imencode(".jpg", frame)
		base64Frames.append(base64.b64encode(buffer).decode("utf-8"))

	video.release()
	print(len(base64Frames), "frames read.")
	return base64Frames

def get_chunks(base64Frames, chunkSize=500):
	chunks = [base64Frames[i:i + chunkSize] for i in range(0, len(base64Frames), chunkSize)]
	print(len(chunks), "chunks created.")
	return chunks    

def get_video_chunk_description(chunk):
	PROMPT_MESSAGES = [
		{
			"role": "user",
			"content": [
				"These are frames from a video that I want to upload.",
				*map(lambda x: {"image": x, "resize": 768}, chunk[::20]),
				"Give a detailed description of this video."
			],
		},
	]
	params = {
		"model": "gpt-4-vision-preview",
		"messages": PROMPT_MESSAGES,
		"max_tokens": 200,
	}
	result = client.chat.completions.create(**params)
	desc = result.choices[0].message.content
	return desc

def get_combined_video_description(descs):
	PROMPT_MESSAGES = [
		{
			"role": "user",
			"content": [
				"Summarize the following texts into a single paragraph. \n" + "\n".join(descs),
			],
		},
	]
	params = {
		"model": "gpt-3.5-turbo-0125",
		"messages": PROMPT_MESSAGES,
		"max_tokens": 200,
	}
	result = client.chat.completions.create(**params)
	desc = result.choices[0].message.content
	return desc

def get_video_description(frames):
	PROMPT_MESSAGES = [
		{
        "role": "system",
        "content": "You are a video question answering assistant."
    },
		{
			"role": "user",
			"content": [
				"These are frames from a video that I want to upload.",
				*map(lambda x: {"image": x, "resize": 768}, frames[::20]),
				"Give a detailed description of this video."
			],
		},
	]
	params = {
		"model": "gpt-4-vision-preview",
		"messages": PROMPT_MESSAGES,
		"max_tokens": 200,
	}
	result = client.chat.completions.create(**params)
	PROMPT_MESSAGES.append({
			"role" : "assistant",
			"content": result.choices[0].message.content
	})
	return PROMPT_MESSAGES

def delete_video(video_path):
	if os.path.exists(video_path):
		# Delete the file
		os.remove(video_path)
		print(f"File {video_path} deleted successfully.")
	else:
		print(f"File {video_path} does not exist.")

def process(video_path):
	frames = get_video_frames(video_path)
	delete_video(video_path)
	# chunks = get_chunks(frames)
	# descs = []
	# for chunk in chunks:
	# 	desc = get_video_chunk_description(chunk)
	# 	descs.append(desc)
	# combined_desc = get_combined_video_description(descs)
	# return combined_desc

	return get_video_description(frames)

