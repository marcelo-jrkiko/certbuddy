
from engine.challenges.DnsChallenge import DnsChallenge, DnsChallengeConfig
import CloudFlare

class CloudflareChallengeConfig(DnsChallengeConfig):
    def __init__(self):
        self.api_token = None
        self.zone_id = None
        
        
class CloudflareChallenge(DnsChallenge):
    def apply(self, domain: str, key: str, token: str) -> None:
        cf = CloudFlare.CloudFlare(token=self.config.api_token)        
        zone_id = self.config.zone_id
        
        self.logger.debug(f"Applying Cloudflare DNS challenge for domain {domain} with key {key}")
        
        if zone_id is None:
            # If zone_id is not provided, we need to find it based on the domain
            zones = cf.zones.get()
            for zone in zones:
                if domain.endswith(zone['name']):
                    zone_id = zone['id']
                    break
        
        if zone_id is None:
            self.logger.error(f"Could not find Cloudflare zone for domain {domain}")
            raise Exception(f"Could not find Cloudflare zone for domain {domain}")  
        
        record_name = f"{key}.{domain}"
        
        self.logger.debug(f"Using Cloudflare zone ID {zone_id} for domain {domain}")
                
        records = cf.zones.dns_records.get(zone_id, params={'name': record_name, 'type': 'TXT'})
        if records:
            # If a record already exists, update it
            record_id = records[0]['id']
            cf.zones.dns_records.put(zone_id, record_id, data={
                'type': 'TXT',
                'name': record_name,
                'content': token,
                'ttl': 120
            })
            self.logger.debug(f"Updated existing Cloudflare DNS record for {record_name} with token")
        else:
            # Otherwise, create a new record
            cf.zones.dns_records.post(zone_id, data={
                'type': 'TXT',
                'name': record_name,
                'content': token,
                'ttl': 120
            })
            self.logger.debug(f"Created new Cloudflare DNS record for {record_name} with token")