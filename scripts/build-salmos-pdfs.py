"""
Monta o PDF final de cada salmo a partir do salmos.zip, seguindo a coluna
`montagem` do relatório gerado por match-salmos-pdfs.py.

A montagem é uma lista "arquivo#página" separada por " + ":
    "022_DOMINGO_DA_PÁSCOA.pdf#todas"                     -> o arquivo inteiro
    "008_MISSA_DO_DIA.pdf#2"                              -> só a 2ª página
    "179_DOMINGO_DA_PÁSCOA.pdf#1 + 180_Ou_13332.pdf#1"    -> duas páginas juntas

Grava <pasta>/<numero>.pdf para cada linha. NÃO grava nada no banco.

Uso:
    python scripts/build-salmos-pdfs.py <casamento.csv> <salmos.zip> <pasta_saida>
"""

import csv
import io
import os
import sys
import zipfile

from pypdf import PdfReader, PdfWriter


def main() -> None:
    caminho_relatorio, caminho_zip, pasta = sys.argv[1:4]
    os.makedirs(pasta, exist_ok=True)

    linhas = list(csv.DictReader(io.open(caminho_relatorio, encoding="utf-8-sig"), delimiter=";"))

    with zipfile.ZipFile(caminho_zip) as z:
        por_nome = {os.path.basename(n): n for n in z.namelist() if n.lower().endswith(".pdf")}
        leitores = {}

        def leitor(nome: str) -> PdfReader:
            if nome not in leitores:
                leitores[nome] = PdfReader(io.BytesIO(z.read(por_nome[nome])))
            return leitores[nome]

        for linha in linhas:
            saida = PdfWriter()
            for parte in linha["montagem"].split(" + "):
                nome, pagina = parte.rsplit("#", 1)
                doc = leitor(nome)
                if pagina == "todas":
                    for p in doc.pages:
                        saida.add_page(p)
                else:
                    saida.add_page(doc.pages[int(pagina) - 1])

            with open(os.path.join(pasta, f"{linha['numero']}.pdf"), "wb") as fh:
                saida.write(fh)

    contagem = {}
    for nome in os.listdir(pasta):
        n = len(PdfReader(os.path.join(pasta, nome)).pages)
        contagem[n] = contagem.get(n, 0) + 1
    print(f"{len(linhas)} PDFs gerados em {pasta}")
    print("páginas por PDF:", dict(sorted(contagem.items())))


if __name__ == "__main__":
    main()
