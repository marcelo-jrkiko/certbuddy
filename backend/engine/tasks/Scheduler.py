

import logging
import threading
import time

from flask import current_app
import schedule

from engine.tasks.RenewalTask import RenewalTask
from engine.tasks.CleanupExpiredCertificatesTask import CleanupExpiredCertificatesTask
from engine.tasks.CleanupOlderRequestTask import CleanupOlderRequestsTask

class Scheduler:
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def init_tasks(self, config):
        self.tasks = [
            {
                "name": "Certificate_Renewal_Task",
                "function": self._run_renewal_task,
                "schedule": f"every({config.RENEWAL_CHECK_INTERVAL}).hours"
            },
            {
                "name": "Cleanup_Expired_Certificates_Task",
                "function": self._run_cleanup_expired_certificates_task,
                "schedule": f"every({config.AUTO_CLEANUP_INTERVAL}).hours"
            },
            {
                "name": "Cleanup_Older_Requests_Task",
                "function": self._run_cleanup_older_requests_task,
                "schedule": f"every(24).hours"
            }
        ]
    
    def run_task(self, name):
        for task in self.tasks:
            if task["name"] == name:
                task["function"]()
                break

    def start(self):
        # Schedule tasks
        for task in self.tasks:
            self.logger.info(f"Scheduling task: {task['name']} with schedule: {task['schedule']}")
            eval(f"schedule.{task['schedule']}.do(task['function'])")
            
        self.run_continuously()
        
    def stop(self):
        if hasattr(self, 'cease_continuous_run'):
            self.cease_continuous_run.set()
            self.logger.info("Scheduler stopped")        
    

    def run_continuously(self, interval=1):
        self.cease_continuous_run = threading.Event()
        parent = self

        class ScheduleThread(threading.Thread):
            def run(self):
                while not parent.cease_continuous_run.is_set():
                    schedule.run_pending()
                    time.sleep(interval)

        self.continuous_thread = ScheduleThread()
        self.continuous_thread.start()
        return self.cease_continuous_run
        
    def _run_renewal_task(self):
        try:
            self.logger.info("Running renewal task...")
            task = RenewalTask()
            task.run()
        except Exception as e:
            self.logger.error(f"Error running renewal task: {e}")
            
    def _run_cleanup_expired_certificates_task(self):
        try:
            self.logger.info("Running cleanup expired certificates task...")
            task = CleanupExpiredCertificatesTask()
            task.run()
        except Exception as e:
            self.logger.error(f"Error running cleanup expired certificates task: {e}")
            
    def _run_cleanup_older_requests_task(self):
        try:
            self.logger.info("Running cleanup older requests task...")
            task = CleanupOlderRequestsTask()
            task.run()
        except Exception as e:
            self.logger.error(f"Error running cleanup older requests task: {e}")