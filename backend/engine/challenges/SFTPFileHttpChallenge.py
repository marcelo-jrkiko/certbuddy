

import os
import paramiko
from engine.challenges.HttpChallenge import HttpChallenge


class SFTPFileHttpChallenge(HttpChallenge):
    def __init__(self):
        super().__init__()
            
    def apply(self, domain: str, key: str, content: str) -> None:
        self.challenge_path = self.config.get("base_path")
        self.private_key_path = self.config.get("private_key_path")
                
        if not self.challenge_path:
            raise Exception("Base path for SFTPFileHttpChallenge is not configured")
        
        if not self.private_key_path:
            raise Exception("Private key path for SFTPFileHttpChallenge is not configured")
                
        # Parse variables in the path
        self.challenge_path = self.challenge_path.replace("{$domain}", domain)
        self.challenge_path = self.challenge_path.replace("{$key}", key)
        
        # Check if the permissions of the private key file are secure (not group or world readable)
        if os.path.exists(self.private_key_path):
            st = os.stat(self.private_key_path)
            if st.st_mode & 0o077:
                self.logger.error(f"Private key file {self.private_key_path} has insecure permissions")
                raise Exception(f"Private key file {self.private_key_path} must not be group or world readable")
            
        # Base directory for the challenge file
        baseDirectory = os.path.dirname(self.challenge_path)
        
        # Connect
        remote_host = self.config.get("remote_host")
        remote_user = self.config.get("remote_user")
        remote_port = self.config.get("remote_port", 22)
        
        key = paramiko.RSAKey.from_private_key_file(self.private_key_path)        
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(hostname=remote_host, port=remote_port, username=remote_user, pkey=key)
        
        # Create base directory if it doesn't exist
        stdin, stdout, stderr = ssh.exec_command(f'mkdir -p {baseDirectory}')
        exit_status = stdout.channel.recv_exit_status()
        if exit_status != 0:
            self.logger.error(f"Error creating base directory {baseDirectory} on remote host: {stderr.read().decode()}")
            raise Exception(f"Error creating base directory {baseDirectory} on remote host: {stderr.read().decode()}")
        
        # Write the challenge content to the file
        sftp = ssh.open_sftp()
        with sftp.file(self.challenge_path, 'w') as f:
            f.write(content)
        sftp.close()
        ssh.close() 
        self.logger.info(f"Applied SFTPFileHttpChallenge for domain {domain} with key {key} at path {self.challenge_path} on remote host {remote_host}")
        