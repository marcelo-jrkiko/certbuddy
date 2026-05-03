


import logging
import json

class NoChallenge:
    def __init__(self):
        self.type = "EMPTY"
        self.logger = logging.getLogger(self.__class__.__name__)

    def configure(self, config: dict | str | None):
        if config:
            if isinstance(config, str):
                config = json.loads(config)
            else:
                self.config = config    
                
    def apply(self) -> None:
        self.logger.info("No challenge to apply for this certificate request.")