"""
Casa cada linha do salmos.csv com o PDF correspondente dentro do salmos.zip e
emite um relatório de conferência. NÃO grava nada no banco.

Por que alinhamento de sequência e não comparação linha a linha: os nomes dos
PDFs não são confiáveis. 78 dos 255 nomes citados no CSV não existem no ZIP, e o
prefixo numérico descompassa a partir do nº180 (o ZIP tem entradas extras que o
CSV não lista). Porém o livro é sequencial — a página cresce monotonicamente —
então a ORDEM é uma âncora muito mais forte que o nome.

O alinhamento (Needleman-Wunsch) encontra a correspondência monotônica que
maximiza a semelhança entre o título do CSV e o nome do arquivo, podendo pular
PDFs extras de graça e deixar uma linha do CSV sem par quando nada serve.

Uso:
    python scripts/match-salmos-pdfs.py <salmos.csv> <salmos.zip> <relatorio.csv>
"""

import csv
import io
import os
import re
import sys
import unicodedata
import zipfile
from difflib import SequenceMatcher

# Abaixo disso, deixar a linha sem par é melhor do que aceitar o par.
PENALIDADE_SEM_PAR = 0.45

FAIXAS = [
    ("alta", 0.85),
    ("media", 0.65),
    ("baixa", 0.0),
]


def normalizar(texto: str) -> str:
    """Remove acentos, pontuação e caixa, para comparar título com nome de arquivo."""
    sem_acento = "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )
    limpo = re.sub(r"[^A-Za-z0-9]+", " ", sem_acento.upper())
    return re.sub(r"\s+", " ", limpo).strip()


def corpo_do_arquivo(nome: str) -> str:
    """'013_1º_DOMINGO_DA_QUARESMA_-_A.pdf' -> '1 DOMINGO DA QUARESMA A'"""
    base = os.path.basename(nome)
    sem_prefixo = re.sub(r"^\d+_", "", base)
    return normalizar(os.path.splitext(sem_prefixo)[0])


def semelhanca(titulo_norm: str, arquivo_norm: str) -> float:
    """
    O nome do arquivo é um trecho truncado do título, e nem sempre o começo:
    "25 DE DEZEMBRO - NATAL DO SENHOR - A - MISSA DA NOITE" virou
    "006_MISSA_DA_NOITE.pdf", que casa com o FIM. Por isso mede-se o quanto do
    nome do arquivo aparece no título, venha de onde vier, em vez de comparar as
    strings inteiras — que puniria o título por ser mais longo.
    """
    if not arquivo_norm or not titulo_norm:
        return 0.0

    sm = SequenceMatcher(None, arquivo_norm, titulo_norm)
    coberto = sum(bloco.size for bloco in sm.get_matching_blocks())
    contencao = coberto / len(arquivo_norm)

    return max(contencao, sm.ratio())


def alinhar(linhas, arquivos):
    """
    Alinhamento monotônico maximizando semelhança total.
    Devolve lista paralela a `linhas` com (indice_do_arquivo | None, score).
    """
    n, m = len(linhas), len(arquivos)
    titulos = [normalizar(r["titulo"]) for r in linhas]
    corpos = [corpo_do_arquivo(a) for a in arquivos]

    score = [[0.0] * m for _ in range(n)]
    for i in range(n):
        for j in range(m):
            score[i][j] = semelhanca(titulos[i], corpos[j])

    NEG = float("-inf")
    dp = [[NEG] * (m + 1) for _ in range(n + 1)]
    de = [[None] * (m + 1) for _ in range(n + 1)]
    dp[0][0] = 0.0
    for j in range(1, m + 1):  # pular PDF extra não custa nada
        dp[0][j] = 0.0
        de[0][j] = "pula_pdf"
    for i in range(1, n + 1):
        dp[i][0] = dp[i - 1][0] - PENALIDADE_SEM_PAR
        de[i][0] = "sem_par"

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            opcoes = (
                (dp[i][j - 1], "pula_pdf"),
                (dp[i - 1][j] - PENALIDADE_SEM_PAR, "sem_par"),
                (dp[i - 1][j - 1] + score[i - 1][j - 1], "casa"),
            )
            dp[i][j], de[i][j] = max(opcoes, key=lambda o: o[0])

    resultado = [None] * n
    i, j = n, m
    while i > 0:
        passo = de[i][j]
        if passo == "casa":
            resultado[i - 1] = (j - 1, score[i - 1][j - 1])
            i, j = i - 1, j - 1
        elif passo == "sem_par":
            resultado[i - 1] = (None, 0.0)
            i -= 1
        else:
            j -= 1
    return resultado


# A divisão do PDF original errou em dois pontos, verificados abrindo as páginas:
#
#   008_MISSA_DO_DIA.pdf  não foi cortado e carrega DUAS páginas do livro:
#     pág. 1 = pág. 10 "MISSA DO DIA" (nº8)
#     pág. 2 = pág. 11 "SAGRADA FAMÍLIA ... - A" (nº255, a linha fora de ordem)
#
#   179_DOMINGO_DA_PÁSCOA.pdf  foi cortado demais: a entrada ocupa as páginas 189 e
#     190 do livro, e a 190 ("Ou Sl 33(32)", salmo alternativo) virou um arquivo
#     solto — justamente o que descompassava a numeração a partir do nº180.
#
#   174_4º_DOMINGO_DA_QUARESMA_-_C.pdf  também não foi cortado:
#     pág. 1 = pág. 183 "4º DOMINGO DA QUARESMA - C" (nº174)
#     pág. 2 = pág. 184 "5º DOMINGO DA QUARESMA - C" (nº256, entrada que faltava
#              no CSV e foi acrescentada por fix-salmos-csv.py)
#
# O nº179 junta as duas páginas, igual às Vigílias dos anos A (022) e B (101),
# em que o divisor manteve o salmo alternativo no mesmo arquivo.
#
# O nº236 (Imaculada Conceição) não é falha de divisão, mas o arquivo herdou o
# nome do cabeçalho da seção ("O MISTÉRIO DE CRISTO NA VIDA DA IGREJA") e a
# semelhança de título fica baixa. Conferido abrindo a página.
#
# Chave: número da linha no CSV. Valor: lista de (arquivo, página começando em 1),
# concatenadas nessa ordem. Todos verificados visualmente.
CASAMENTOS_VERIFICADOS = {
    "236": [("237_O_MISTÉRIO_DE_CRISTO_NA_VIDA_DA_IGREJA.pdf", 1)],
    "8": [("008_MISSA_DO_DIA.pdf", 1)],
    "255": [("008_MISSA_DO_DIA.pdf", 2)],
    "174": [("174_4º_DOMINGO_DA_QUARESMA_-_C.pdf", 1)],
    "256": [("174_4º_DOMINGO_DA_QUARESMA_-_C.pdf", 2)],
    "179": [("179_DOMINGO_DA_PÁSCOA.pdf", 1), ("180_Ou_13332.pdf", 1)],
}

ANO_NO_ARQUIVO = re.compile(r"[_-]\s*([ABC])\s*$")


def ano_do_arquivo(nome: str) -> str:
    """Extrai o ciclo litúrgico do fim do nome, quando houver: '..._-_B.pdf' -> 'B'."""
    corpo = os.path.splitext(os.path.basename(nome))[0]
    achado = ANO_NO_ARQUIVO.search(corpo)
    return achado.group(1) if achado else ""


def conflito_de_ano(linha, nome_pdf: str) -> bool:
    """
    Guarda independente da semelhança textual. "SAGRADA FAMÍLIA ... - A" e
    "..._-_B.pdf" diferem numa letra só e pontuam 0.97, mas são anos litúrgicos
    distintos — partitura errada. Quando ambos declaram o ciclo, eles têm que bater.
    """
    ano_csv = linha["ano"].strip().upper()
    ano_pdf = ano_do_arquivo(nome_pdf)
    return bool(ano_csv and ano_pdf and ano_csv != ano_pdf)


def faixa(score: float) -> str:
    for nome, piso in FAIXAS:
        if score >= piso:
            return nome
    return "baixa"


def main() -> None:
    caminho_csv, caminho_zip, caminho_saida = sys.argv[1:4]

    linhas = list(csv.DictReader(io.open(caminho_csv, encoding="utf-8-sig"), delimiter=";"))
    with zipfile.ZipFile(caminho_zip) as z:
        arquivos = sorted(
            (n for n in z.namelist() if n.lower().endswith(".pdf")),
            key=lambda n: int(re.match(r"(\d+)_", os.path.basename(n)).group(1)),
        )

    print(f"CSV: {len(linhas)} linhas | ZIP: {len(arquivos)} PDFs")

    # O alinhamento monotônico pressupõe que a página do livro cresce. Uma linha que
    # quebra essa ordem (há uma: a nº255, anexada no fim com página 11) envenenaria o
    # alinhamento inteiro, então sai dele e casa por semelhança pura.
    fora_de_ordem = []
    maior_pagina = 0
    em_ordem = []
    for linha in linhas:
        pagina = int(linha["pagina_livro"])
        if pagina <= maior_pagina:
            fora_de_ordem.append(linha)
        else:
            maior_pagina = pagina
            em_ordem.append(linha)

    if fora_de_ordem:
        print(f"fora de ordem (casadas separadamente): {[l['numero'] for l in fora_de_ordem]}")

    print("Alinhando...")
    pares_em_ordem = alinhar(em_ordem, arquivos)

    por_numero = {}
    for linha, par in zip(em_ordem, pares_em_ordem):
        por_numero[linha["numero"]] = par
    for linha in fora_de_ordem:
        titulo = normalizar(linha["titulo"])
        melhor, melhor_score = None, 0.0
        for j, arq in enumerate(arquivos):
            sc = semelhanca(titulo, corpo_do_arquivo(arq))
            if sc > melhor_score:
                melhor, melhor_score = j, sc
        por_numero[linha["numero"]] = (melhor, melhor_score)

    pares = [por_numero[l["numero"]] for l in linhas]

    por_base = {os.path.basename(a): i for i, a in enumerate(arquivos)}

    usados = set()
    saida = []
    for linha, par in zip(linhas, pares):
        idx, score = par
        escolhido = os.path.basename(arquivos[idx]) if idx is not None else ""
        montagem = f"{escolhido}#todas" if escolhido else ""

        correcao = CASAMENTOS_VERIFICADOS.get(linha["numero"])
        if correcao:
            escolhido = correcao[0][0]
            montagem = " + ".join(f"{arq}#{pg}" for arq, pg in correcao)
            score = 1.0
            idx = por_base.get(escolhido)
            for arq, _ in correcao:
                if arq in por_base:
                    usados.add(por_base[arq])

        if idx is not None:
            usados.add(idx)
        conflito = bool(escolhido) and not correcao and conflito_de_ano(linha, escolhido)
        if conflito:
            rotulo = "CONFLITO_DE_ANO"
        elif idx is None:
            rotulo = "sem_par"
        else:
            rotulo = faixa(score)

        saida.append(
            {
                "numero": linha["numero"],
                "pagina_livro": linha["pagina_livro"],
                "ano": linha["ano"],
                "titulo": linha["titulo"],
                "arquivo_citado_no_csv": linha["arquivo"],
                "pdf_escolhido": escolhido,
                "montagem": montagem,
                "confianca": f"{score:.3f}",
                "faixa": rotulo,
                "ano_do_pdf": ano_do_arquivo(escolhido) if escolhido else "",
                "csv_acertou_o_nome": "sim"
                if escolhido and escolhido == linha["arquivo"].strip()
                else "nao",
            }
        )

    with io.open(caminho_saida, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(saida[0].keys()), delimiter=";")
        w.writeheader()
        w.writerows(saida)

    cont = {}
    for r in saida:
        cont[r["faixa"]] = cont.get(r["faixa"], 0) + 1
    print("\n--- confianca do casamento ---")
    for nome in ("alta", "media", "baixa", "sem_par", "CONFLITO_DE_ANO"):
        if cont.get(nome):
            print(f"   {nome:<8}: {cont[nome]:>3}")
    acertou = sum(1 for r in saida if r["csv_acertou_o_nome"] == "sim")
    print(f"\n   o nome citado no CSV estava certo em {acertou} de {len(saida)}")
    print(f"   PDFs do ZIP nao usados: {len(arquivos) - len(usados)}")
    print(f"\nrelatorio: {caminho_saida}")


if __name__ == "__main__":
    main()
