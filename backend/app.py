# app.py
from flask import Flask, jsonify, request
from fileinput import filename 
import os
from os.path import join, dirname
from dotenv import load_dotenv
from functools import wraps
from video.video_processing import process
from audio.audio_processing import get_video_summary


load_dotenv('.env', override=True)

app = Flask(__name__)
app.secret_key = os.environ.get('APP_SECRET_KEY')

API_KEY=os.environ.get("API_KEY")

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if 'x-api-key' is present in headers
        if 'x-api-key' in request.headers:
            # Validate the API key
            if request.headers['x-api-key'] == API_KEY:
                return f(*args, **kwargs)
            else:
                return jsonify({'message': 'Invalid API key'}), 403
        else:
            return jsonify({'message': 'API key is missing'}), 401
    return decorated_function



@app.route('/', methods=['GET'])
def index():
    return jsonify({"message": "Hello, World!"}), 200


@app.route('/query/video', methods=['POST'])
@require_api_key
def video_query():
	try :
		f = request.files['file'] 
		f.save(f.filename) 
	except Exception as e:
		print(e)
		return jsonify({"message": "Error in file upload"}), 500
	
	print(f.filename + " uploaded successfully")
	# Process the video
	descs = " ".join(process(f.filename))
	print(descs)
	return jsonify({"description": descs}), 200

@app.route('/query/audio', methods=['POST'])
@require_api_key
def audio_query():
    try:
        f = request.files['file']
        f.save('temp/'+f.filename)
    except Exception as e:
        print(e)
        return jsonify({"message": "Error in file upload"}), 500
    
    print(f.filename + " uploaded successfully")
    # Process the video
    summary, transcript = get_video_summary('temp/' + f.filename)

    return jsonify({"description": summary, "transcript": transcript}), 200

if __name__ == '__main__':
	app.run(debug=True, host='localhost', port=8001)
