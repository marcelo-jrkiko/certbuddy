

import os
import time

import requests
from utils import Config

from engine.challenges.HttpChallenge import HttpChallenge
from engine.repositories.InteractionRequestRepository import InteractionRequestRepository


class LocalFileHttpChallenge(HttpChallenge):
    def __init__(self):
        super().__init__()
        
    def _generate_nginx_config(self, domain: str) -> str:            
        domain_www_path = f"{Config.HTTP_CHALLENGE_DIR}/{domain}"
        nginx_config_path = f"{Config.NGINX_CONFIG_DIR}/{domain}.conf"
        nginx_config_content = f"""
server {{
    listen 8080;
    server_name {domain};

    location /.well-known/acme-challenge/ {{
        root {domain_www_path};
    }}
    
    location / {{
        return 404;
    }}
}}
"""
        with open(nginx_config_path, "w") as f:
            f.write(nginx_config_content)
            f.flush()
        
        self.logger.info(f"Nginx configuration generated at {nginx_config_path} for domain {domain}")    
            
    def apply(self, domain: str, key: str, content: str) -> None:
        self.challenge_path = Config.HTTP_CHALLENGE_DIR + "/{$domain}/{$key}"
        
        self.logger.info(f"Applying LocalFileHttpChallenge for domain {domain} with key {key} at path {self.challenge_path}")        
        
        interaction_repo = InteractionRequestRepository()
        user_id = self.request.issue_to
                
        # Parse variables in the path
        self.challenge_path = self.challenge_path.replace("{$domain}", domain)        
        # Remove the first / from the key
        if key.startswith("/"):
            key = key[1:]
        
        self.challenge_path = self.challenge_path.replace("{$key}", key)        
        baseDirectory = os.path.dirname(self.challenge_path)                
        if not os.path.exists(baseDirectory):
            os.makedirs(baseDirectory)
            
        self.logger.info(f"Challenge directory created at {baseDirectory} for domain {domain} with key {key}")
        
        # Write the challenge content to the file
        with open(self.challenge_path, "w") as f:
            f.write(content)          
            f.flush()  
         
        self.logger.info(f"Challenge file created at {self.challenge_path} for domain {domain} with key {key}")   
            
        # Generate the Nginx configuration for this challenge
        self._generate_nginx_config(domain)
        
        # Reload Nginx to apply the new configuration
        os.system("nginx -s reload")
        
        # - Check if the challenge is valid by making a GET request to the challenge URL
        url = f"http://{domain}/{key}"
        isOk = False
        
        skipValidation = self.config.get("skip_pre_validation", False)        
        
        tryCount = 0
        
        test_result = {
            "url": url,
            "expected_content": content,
            "status_code": None,
            "actual_content": None
        }
        
        if not skipValidation:        
            while tryCount < 3 and not isOk:
                try:
                    self.logger.info(f"Making GET request to {url} to validate the challenge for domain {domain} with key {key}")
                    response = requests.get(url)
                    test_result["status_code"] = response.status_code
                    test_result["actual_content"] = response.text.strip()
                    if response.status_code == 200 and response.text.strip() == content.strip():
                        isOk = True
                    else:
                        self.logger.error(f"HTTP challenge validation failed for domain {domain} with key {key}. status code {response.status_code}. Actual content: {response.text.strip()}")
                        time.sleep(15)  # Wait for 15 seconds before retrying
                        tryCount += 1
                except requests.RequestException as e:
                    test_result["status_code"] = 500
                    test_result["actual_content"] = "Error making the requests"
                    self.logger.error(f"Error while making GET request to {url}. {e}")
                    tryCount += 1
        else:
            self.logger.info(f"Skipping HTTP challenge pre-validation for domain {domain} with key {key}")
            isOk = True

        if not isOk:
            self.logger.error(f"HTTP challenge validation failed for domain {domain} with key {key}")
            # Create a InteractionRequest to notify the user that the challenge failed              
            
            interaction_request = interaction_repo.create_request(
                user_id=user_id,
                request_type="http_challenge_failed",
                request_data={
                    "domain": domain,
                    "url": url,
                    "expected_content": content,
                    "reason": f"Expected content '{content}' but got '{test_result['actual_content']}' with status code {test_result['status_code']}"
                },
                status="new",
            )

            result = interaction_repo.wait_for_answer(
                interaction_request.id,
                timeout_seconds=84600,
                poll_interval_seconds=30,
            )
            
            if (result.status or "").lower() == "rejected":
                response_data = result.response_data or {}
                reason = response_data.get("reason") or "Manual HTTP challenge was rejected"
                self.logger.error(f"Manual HTTP challenge request {interaction_request.id} rejected: {reason}")
                raise Exception(reason)
        
        self.logger.info(f"Applied LocalFileHttpChallenge for domain {domain} with key {key} at path {self.challenge_path}")
        
        