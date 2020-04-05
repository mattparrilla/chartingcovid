from datetime import datetime

from flask_frozen import Freezer
from flask import Flask, render_template, send_from_directory


app = Flask(__name__)
freezer = Freezer(app)

app.debug = True
app.config["FREEZER_DESTINATION"] = "dist"

# Needed to populate social media meta tags with full path
url_prefix = "https://chartingcovid.com"


# Handle wildcard URLs (anything not defined in this file)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def index(path):
    description = "The story of COVID-19 is a story of trends. We've been told to practice social distancing in order to flatten the curve, but how are we doing?"
    title = "COVID In The Counties"
    social_img = "{}/static/coronavirus_county_map.png".format(url_prefix)

    return render_template("index.html",
        url_prefix=url_prefix,
        description=description,
        timestamp=datetime.utcnow().timestamp(),
        social_img=social_img,
        title=title)


@app.route("/data/<json_file>")
def data(json_file):
    response = send_from_directory('data', filename=json_file)
    response.headers["Content-Type"] = "application/json"
    return response


@freezer.register_generator
def index():
    yield {"path": "index.html"}


if __name__ == "__main__":
    freezer.freeze()
