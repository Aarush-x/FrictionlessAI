# =========================================================
# Stage 1: Build & Development Stage
# =========================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Define build arguments for Vite (passed at build time)
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_FIRESTORE_DATABASE_ID
ARG VITE_INSTACART_API_KEY
ARG GEMINI_API_KEY

# Set environment variables for the build process
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_FIRESTORE_DATABASE_ID=$VITE_FIREBASE_FIRESTORE_DATABASE_ID
ENV VITE_INSTACART_API_KEY=$VITE_INSTACART_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

# Build the application
RUN npm run build

# =========================================================
# Stage 2: Production Stage (Nginx)
# =========================================================
FROM nginx:alpine AS production

# Copy custom Nginx configuration to support SPA routing (React Router)
RUN echo $'\
server {\n\
    listen 80;\n\
    server_name localhost;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    error_page 500 502 503 504 /50x.html;\n\
    location = /50x.html {\n\
        root /usr/share/nginx/html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

# Copy build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
