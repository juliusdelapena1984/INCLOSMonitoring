# Stage 1: Build the React application
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN yarn cache clean
RUN yarn install

COPY . .

RUN yarn build

# Stage 2: Serve the React application with Nginx
FROM nginx:alpine

# Remove the default Nginx configuration file
# This is crucial, as the default one has its own 'events' and 'http' blocks
RUN rm /etc/nginx/nginx.conf

# Copy your custom Nginx configuration to be the *main* config file
# NOT into conf.d, but as the primary nginx.conf
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

# Copy the built React application
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80 for the React application
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]