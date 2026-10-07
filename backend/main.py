from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/api/image", methods=["POST"])
def process_image():
    return jsonify({"error": "O processamento de imagens ainda não foi implementado."}), 501

if __name__ == "__main__":
    app.run(port=5000, debug=True)