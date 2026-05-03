
from engine.challenges.DnsChallenge import DnsChallenge
from cloudflare import Cloudflare

class CloudflareChallengeConfig:
    def __init__(self):
        self.api_token = None
        self.zone_id = None
        
        
class CloudflareDnsChallenge(DnsChallenge):
    def apply(self, domain: str, key: str, token: str) -> None:    
        zone_id = self.config.get("zone_id")
        api_token = self.config.get("api_token")
        
        # Validate API token is configured
        if not api_token:
            self.logger.error("Cloudflare API token not configured")
            raise ValueError("Cloudflare API token is required but not configured")
        
        cf = Cloudflare(api_token=api_token)            
        self.logger.debug(f"Applying Cloudflare DNS challenge for domain {domain} with key {key}")
        
        if zone_id is None:
            # If zone_id is not provided, we need to find it based on the domain
            try:
                zones = cf.zones.list()
            except Exception as e:
                self.logger.error(f"Failed to list zones from Cloudflare: {e}")
                raise
            
            for zone in zones:
                if domain.endswith(zone.name):
                    zone_id = zone.id
                    break
        
        if zone_id is None:
            self.logger.error(f"Could not find Cloudflare zone for domain {domain}")
            raise Exception(f"Could not find Cloudflare zone for domain {domain}")  
        
        
        self.logger.debug(f"Using Cloudflare zone ID {zone_id} for domain {domain}")                
        record_name = f"{key}.{domain}"
        
        try:
            paginated_records = cf.dns.records.list(zone_id=zone_id, name=record_name, type='TXT')
            records = list(paginated_records)
        except Exception as e:
            self.logger.error(f"Failed to list DNS records for {record_name}: {e}")
            raise
        
        existing_record = records[0] if records else None
        
        if existing_record:
            # If a record already exists, update it
            record_id = existing_record.id
            try:
                cf.dns.records.update(zone_id=zone_id, dns_record_id=record_id,
                    type='TXT',
                    name=record_name,
                    content=token,
                    ttl=120
                )
                self.logger.debug(f"Updated existing Cloudflare DNS record for {record_name} with token")
            except Exception as e:
                self.logger.error(f"Failed to update DNS record {record_id}: {e}")
                raise
        else:
            # Otherwise, create a new record
            try:
                cf.dns.records.create(zone_id=zone_id,
                    type='TXT',
                    name=record_name,
                    content=token,
                    ttl=120
                )
                self.logger.debug(f"Created new Cloudflare DNS record for {record_name} with token")
            except Exception as e:
                self.logger.error(f"Failed to create DNS record for {record_name}: {e}")
                raise