"""Lasttest mit Locust für PC-Komponenten."""

from typing import Final

import urllib3  # type: ignore
from locust import HttpUser, constant_throughput, task  # type: ignore

# Warnungen für selbst-signierte Zertifikate unterdrücken
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class PcRequests(HttpUser):
    """Lasttest für HTTP-Requests fuer den PC-Server."""

    wait_time = constant_throughput(0.1)  # type: ignore[no-untyped-call]
    MIN_USERS: Final = 500
    MAX_USERS: Final = 500

    def on_start(self) -> None:
        """Initialisierung: selbst-signiertes Zertifikat erlauben."""
        self.client.verify = False

    @task(100)
    def get_id(self) -> None:
        """GET-Requests mit Pfadparameter: Komponenten-ID."""
        # IDs aus den CSVs
        id_list: Final = [10, 20, 30, 50]
        for pc_id in id_list:
            self.client.get(f"/rest/{pc_id}")

    @task(200)
    def get_name(self) -> None:
        """GET-Requests mit Query-Parameter: Teilstring des Namens."""
        name_list = ["GeForce", "Ryzen", "Core", "Samsung"]
        for teil in name_list:
            self.client.get("/rest", params={"name": teil})

    @task(150)
    def get_typ(self) -> None:
        """GET-Requests mit Query-Parameter: Typ."""
        typ_list: Final = ["CPU", "GPU", "SSD"]
        for typ in typ_list:
            self.client.get("/rest", params={"typ": typ})
