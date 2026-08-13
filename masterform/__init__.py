"""masterform - Ausfüllen von Word-Dokumenten mittels Python.

Dieses Paket kümmert sich (vorerst) um reine Text-Templates: Word-Dokumente,
in denen Platzhalter wie ``{{feld}}`` im Fließtext, in Tabellen sowie in
Kopf- und Fußzeilen stehen und durch echte Werte ersetzt werden sollen.
"""

from .fill import fill_template, fill_document, find_placeholders

__all__ = ["fill_template", "fill_document", "find_placeholders"]
