from flask_frozen import Freezer
from flask import Flask, render_template


app = Flask(__name__)
freezer = Freezer(app)

app.debug = True
app.config["FREEZER_DESTINATION"] = "dist"

# Needed to populate social media meta tags with full path
url_prefix = "https://ramblemaps.com"


@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    freezer.freeze()
