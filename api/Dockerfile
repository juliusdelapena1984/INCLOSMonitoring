# Use a lightweight Python base image
FROM python:3.11-slim-buster

# Set the working directory
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
#RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Expose the port the Flask app runs on
EXPOSE 5000

# Command to run the Flask application
CMD ["python", "app.py"]