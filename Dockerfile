# 1단계: 애플리케이션 빌드
FROM node:16 AS build

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 복사
COPY package*.json ./

# 의존성 설치
RUN npm install

# 모든 소스 코드 복사
COPY . .

# 애플리케이션 빌드
RUN npm run build

# 2단계: 애플리케이션 제공
FROM nginx:alpine

# 사용자 정의 nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/nginx.conf

# 첫 번째 단계에서 빌드한 아티팩트를 Nginx의 html 디렉토리로 복사
COPY --from=build /app/build /usr/share/nginx/html

# 포트 80 노출
EXPOSE 80 443

# Nginx 서버 실행
CMD ["nginx", "-g", "daemon off;"]
