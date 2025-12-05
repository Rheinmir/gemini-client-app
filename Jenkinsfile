pipeline {
    agent { label 'dockerlinux' }
    triggers { githubPush() }

    stages {
        stage('Pull Source') {
            steps {
                sh 'git status'
            }
        }

        stage('Build & Deploy') {
            steps {
                sh '''
                docker stop gemini-toon-chat || true
                docker rm gemini-toon-chat || true
                docker rmi gemini-toon-chat || true

                docker build -t gemini-toon-chat .

                docker run -d --name gemini-toon-chat \
                    -p 1060:3000 \
                    -v /Users/giatran/gemini-data:/app/data \
                    gemini-toon-chat
                '''
            }
        }
    }
}