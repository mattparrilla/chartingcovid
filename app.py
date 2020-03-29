from flask_frozen import Freezer
from flask import Flask, render_template


app = Flask(__name__)
freezer = Freezer(app)

app.debug = True
app.config["FREEZER_DESTINATION"] = "dist"

# Needed to populate social media meta tags with full path
url_prefix = "https://chartingcovid.com"


@app.route("/")
def index():
    description = "Making COVID-19 trends understandable using clear charts and maps."
    title = "Charting the COVID-19 Coronavirus"
    return render_template("index.html",
        url_prefix=url_prefix,
        description=description,
        title=title)


if __name__ == "__main__":
    freezer.freeze()
