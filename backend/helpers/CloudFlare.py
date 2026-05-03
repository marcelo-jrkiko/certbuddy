

from cloudflare import Cloudflare
import fnmatch

def get_zone_id(self, cf: Cloudflare, domain: str) -> str:
    zone_id = None
    zones = cf.zones.list()
    
    for zone in zones:
        if fnmatch.fnmatch(domain, f"*.{zone.name}") or domain == zone.name:
            zone_id = zone.id
            break
        
    return zone_id