import os

from flask import Flask, render_template, request, jsonify
from pip._vendor import requests


# import spyned


def create_app(test_config=None):
    # create and configure the app
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY='dev',
        DATABASE=os.path.join(app.instance_path, 'flaskr.sqlite'),
    )

    # app.wsgi_app = DispatcherMiddleware(app.wsgi_app, {
    #     '/soap': WsgiApplication(spyned.create_app(app))
    # })

    if test_config is None:
        # load the instance config, if it exists, when not testing
        app.config.from_pyfile('config.py', silent=True)
    else:
        # load the test config if passed in
        app.config.from_mapping(test_config)

    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    # a simple page that says hello
    @app.route('/')
    def index():
        return 'Hello, World!'

    @app.route('/test')
    def test_apiRest():
        query = {'todo1' : 'task'}
        requests.delete(url='http://127.0.0.1:5000/todos/todo4')
        # response = requests.delete(url='http://127.0.0.1:5000/todos', params=query)
        # print(response.json())
        return render_template('testApiRes.html')

    # @app.route('/lectureJS', methods=['POST'])
    # def lectureJS():
    #     print("LECTURE JS : ")
    #     print(request.data)
    #     return render_template('hello.html', name="Antoine")

    @app.route('/hello/<name>')
    def hello(name=None):
        return render_template('hello.html', name=name)

    return app
