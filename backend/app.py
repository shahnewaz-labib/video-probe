# app.py
from flask import Flask, jsonify, request
from fileinput import filename 
import os
from os.path import join, dirname
from dotenv import load_dotenv

from video.video_processing import process, get_key


load_dotenv('.env', override=True)

app = Flask(__name__)
app.secret_key = os.environ.get('APP_SECRET_KEY')

@app.route('/', methods=['GET'])
def index():
    return jsonify({"message": "Hello, World!"}), 200

@app.route('/query/video', methods=['POST'])
def video_query():
	try :
		f = request.files['file'] 
		f.save(f.filename) 
	except Exception as e:
		print(e)
		return jsonify({"message": "Error in file upload"}), 500
	
	print(f.filename + " uploaded successfully")
	# Process the video
	descs = process(f.filename)
	return jsonify({"description": descs}), 200

if __name__ == '__main__':
	app.run(debug=True, host='localhost', port=8001)
