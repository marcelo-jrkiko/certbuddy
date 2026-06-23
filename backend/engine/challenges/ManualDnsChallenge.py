
from engine.challenges.DnsChallenge import DnsChallenge
from engine.repositories.InteractionRequestRepository import InteractionRequestRepository


class ManualDnsChallenge(DnsChallenge):
    def apply(self, domain: str, key: str, token: str) -> None:
        user_id = self.request.issue_to
        interaction_repo = InteractionRequestRepository()
        
        self.logger.info(f"Creating manual DNS challenge request for user {user_id}, domain {domain}, key {key}")
        
        interaction_request = interaction_repo.create_request(
            user_id=user_id,
            request_type="dns_change",
            request_data={
                "domain": domain,
                "record_name": f"{key}.{domain}",
                "token": token,
                "record_type": "TXT",
            },
            status="new",
        )

        timeout_seconds = int(self.config.get("timeout_seconds", 86400))
        poll_interval_seconds = float(self.config.get("poll_interval_seconds", 30))


        self.logger.info(f"Waiting for manual DNS challenge to be answered for request {interaction_request.id} with timeout {timeout_seconds}s and poll interval {poll_interval_seconds}s")

        result = interaction_repo.wait_for_answer(
            interaction_request.id,
            timeout_seconds=timeout_seconds,
            poll_interval_seconds=poll_interval_seconds,
        )
        
        self.logger.info(f"Manual DNS challenge request {interaction_request.id} completed with status {result.status}")

        if (result.status or "").lower() == "rejected":
            response_data = result.response_data or {}
            reason = response_data.get("reason") or "Manual DNS challenge was rejected"
            self.logger.error(f"Manual DNS challenge request {interaction_request.id} rejected: {reason}")
            raise Exception(reason)
       