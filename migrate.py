from flask import Flask
from instance import db
from flask_migrate import Migrate

app = Flask(__name__)
app.config.from_object("config")  # your config file
db.init_app(app)

migrate = Migrate(app, db)
