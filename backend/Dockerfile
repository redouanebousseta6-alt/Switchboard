# Use a Node.js image
FROM node:20-slim

# Install system libraries needed to run a browser (Puppeteer/Chrome)
# And build tools for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    # Chrome/Puppeteer dependencies
    libnss3 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxss1 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libxshmfence1 \
    ca-certificates \
    fonts-liberation \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# IMPORTANT: Let Puppeteer download the correct Chrome version for this container
RUN npx puppeteer browsers install chrome

# Copy the rest of your code
COPY . .

# Expose the port
EXPOSE 3000

# Command to run
CMD [ "node", "server.js" ]
