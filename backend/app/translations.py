from typing import Optional

SEVERITY_MAP: dict[str, str] = {
    "S": "fatal",
    "C": "serious",
    "L": "slight",
    "Śmiertelny": "fatal",
    "Ciężki": "serious",
    "Lekki": "slight",
}

DESCRIPTION_MAP: dict[str, str] = {
    "Zderzenie pojazdów boczne": "Side vehicle collision",
    "Zderzenie pojazdów tylne": "Rear vehicle collision",
    "Zderzenie pojazdów czołowe": "Head-on vehicle collision",
    "Najechanie na pieszego": "Pedestrian collision",
    "Najechanie na barierę ochronną": "Collision with guard rail",
    "Najechanie na drzewo": "Collision with tree",
    "Najechanie na dziurę, wybój, garb": "Collision with pothole or bump",
    "Najechanie na pojazd unieruchomiony": "Collision with stalled vehicle",
    "Najechanie na słup, znak": "Collision with pole or sign",
    "Wypadek z pasażerem": "Passenger accident",
    "Wywrócenie się pojazdu": "Vehicle rollover",
    "Zdarzenie z osobą UWR": "Incident with vulnerable road user",
    "Inne": "Other",
}

PLACE_MAP: dict[str, str] = {
    "PRZEJŚCIE DLA PIESZYCH": "Pedestrian crossing",
    "INNE MIEJSCE DLA PIESZYCH": "Other pedestrian area",
    "PRZEJAZD DLA ROWERZYSTÓW (od 2016 roku)": "Cyclist crossing (from 2016)",
    "DROGA, PAS RUCHU, ŚLUZA DLA ROWERÓW (od 2016 roku)": "Road, lane or bicycle lane (from 2016)",
    "PRZEJAZD, TOROWISKO TRAMWAJOWE": "Tram crossing / tram tracks",
    "PRZEJAZD KOLEJOWY STRZEŻONY": "Guarded railway crossing",
    "PRZEJAZD KOLEJOWY NIESTRZEŻONY": "Unguarded railway crossing",
    "INNE NA JEZDNI": "Other on roadway",
    "POZOSTAŁE": "Other",
}

ROAD_TYPE_MAP: dict[str, str] = {
    "Międzynarodowa": "International",
    "TEN-T": "TEN-T",
    "Krajowa autostrada": "National motorway",
    "Krajowa ekspresowa": "National express road",
    "Krajowa inna": "Other national road",
    "Wojewódzka": "Provincial road",
    "Powiatowa": "County road",
    "Gminna": "Municipal road",
    "Miasto": "City",
}


def translate(mapping: dict[str, str], value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    return mapping.get(value, value)
