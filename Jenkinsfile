pipeline {
    agent any
    environment {
        DOCKER_IMAGE = 'sajal30/asthropic-chatapp-backend'
        DOCKER_CREDENTIALS_ID = 'dockerhub-secret-id' // Jenkins credentials mein set kiya hua ID
    }
    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }
        stage('Build Docker Image') {
            steps {
                dir('backend') {
                    script {
                        app = docker.build("${env.DOCKER_IMAGE}:${env.BUILD_NUMBER}")
                    }
                }
            }
        }
        stage('Push to Docker Hub') {
            steps {
                script {
                    docker.withRegistry('https://index.docker.io/v1/', "${env.DOCKER_CREDENTIALS_ID}") {
                        app.push("${env.BUILD_NUMBER}")
                        app.push("latest")
                    }
                }
            }
        }
    }
}
