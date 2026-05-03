

import os

from engine.challenges.HttpChallenge import HttpChallenge


class LocalFileHttpChallenge(HttpChallenge):
    def __init__(self):
        super().__init__()
            
    def apply(self, domain: str, key: str, content: str) -> None:
        self.challenge_path = self.config.get("base_path")
        if not self.challenge_path:
            raise Exception("Base path for LocalFileHttpChallenge is not configured")
        
        # Parse variables in the path
        self.challenge_path = self.challenge_path.replace("{$domain}", domain)
        self.challenge_path = self.challenge_path.replace("{$key}", key)
        
        baseDirectory = os.path.dirname(self.challenge_path)
        
        if not os.path.exists(baseDirectory):
            os.makedirs(baseDirectory)
        
        with open(self.challenge_path, "w") as f:
            f.write(content)            
            
        self.logger.debug(f"Applied LocalFileHttpChallenge for domain {domain} with key {key} at path {self.challenge_path}")
        
        