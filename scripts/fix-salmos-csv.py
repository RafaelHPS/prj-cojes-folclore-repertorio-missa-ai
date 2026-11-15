"""
Gera salmos_corrigido.csv a partir do salmos.csv, aplicando as correções
levantadas lendo página a página o livro "Salmos e Aclamações Ano A B C.pdf".
NÃO grava nada no banco.

O padrão de título do CSV é mantido: CABEÇALHO DO DIA - ANO - TEMA [- SUBTÍTULO].
As correções caem em quatro grupos:

  1. Estrutura — uma entrada faltando (5º Domingo da Quaresma C, colada no 4º)
     e um título que era o cabeçalho de seção, não o salmo (nº236).
  2. Erros de leitura (OCR) — ALEGRAL/CONVERTEL, "L1 *", "S1"/"SI" no lugar de
     "Sl", vírgula no lugar de ponto em "19º,", "(VD)" no lugar de "(VI)".
  3. Partes do título que o livro tem e o CSV perdeu — tema da celebração,
     "MISSA DO CRISMA", "MISSA DA VIGÍLIA", "I/II/III MISSA".
  4. Títulos que só fazem sentido com o cabeçalho anterior ("MISSA DO DIA",
     "SEGUNDA LEITURA") ou sem o ano litúrgico — idênticos entre A, B e C e,
     portanto, indistinguíveis no catálogo.

Uso:
    python scripts/fix-salmos-csv.py <salmos.csv> <salmos_corrigido.csv> <diferencas.csv>
"""

import csv
import io
import sys

VIGILIA = "DOMINGO DA PÁSCOA NA RESSURREIÇÃO DO SENHOR - {ano} - VIGÍLIA PASCAL NA NOITE SANTA - {leitura}"
LEITURAS = [
    "PRIMEIRA LEITURA",
    "SEGUNDA LEITURA",
    "TERCEIRA LEITURA",
    "QUARTA LEITURA",
    "QUINTA LEITURA",
    "SEXTA LEITURA",
    "SÉTIMA LEITURA",
    "LEITURAS DO NOVO TESTAMENTO",
]
NATAL = "25 DE DEZEMBRO - NATAL DO SENHOR - {ano} - {missa}"
FINADOS = "2 de novembro - COMEMORAÇÃO DE TODOS OS FIÉIS FALECIDOS - {parte}"


def semana_santa(ano: str, inicio: int) -> dict:
    """Ramos, Quinta (Crisma e Ceia), Sexta, as 8 leituras da Vigília e o Dia da Páscoa."""
    titulos = {
        inicio: f"DOMINGO DE RAMOS - DA PAIXÃO DO SENHOR - {ano} - CRISTO VAI AO ENCONTRO DA MORTE COM LIBERDADE DE FILHO",
        inicio + 1: f"QUINTA FEIRA DA SEMANA SANTA - {ano} - CRISTO SACERDOTE INSTITUI O SACRAMENTO DO AMOR - MISSA DO CRISMA",
        inicio + 2: f"QUINTA FEIRA DA SEMANA SANTA - {ano} - MISSA DA CEIA DO SENHOR",
        inicio + 3: f"SEXTA-FEIRA DA PAIXÃO DO SENHOR - {ano} - CRISTO VERDADEIRO CORDEIRO PASCAL",
    }
    for i, leitura in enumerate(LEITURAS):
        titulos[inicio + 4 + i] = VIGILIA.format(ano=ano, leitura=leitura)
    titulos[inicio + 12] = f"MISSA DO DIA DA PÁSCOA - {ano} - PÁSCOA DO SENHOR, NOVA CRIAÇÃO E NOVO ÊXODO"
    titulos[inicio + 13] = f"MISSA DO DIA DA PÁSCOA - {ano} - SEQUÊNCIA"
    return titulos


TITULOS = {
    # ── Ano A ────────────────────────────────────────────────────────────────
    3: "3º. DOMINGO DO ADVENTO - A - ALEGRAI-VOS! A LIBERTAÇÃO ESTÁ PRÓXIMA",
    11: "(No domingo entre 2 a 8 de janeiro) - EPIFANIA DO SENHOR - A - NA IGREJA CRISTO SE REVELA A TODOS OS POVOS",
    12: "(Domingo entre 9 a 13 de janeiro) - BATISMO DO SENHOR - A - O PAI MANIFESTA A MISSÃO DO FILHO",
    **semana_santa("A", 18),
    36: "6º. DOMINGO DA PÁSCOA - A - JESUS RESSUSCITADO, TESTEMUNHADO PELOS CRISTÃOS QUE SE AMAM",
    39: "DOMINGO DE PENTECOSTES - A - A IGREJA VIVE NO ESPÍRITO SANTO - MISSA DA VIGÍLIA",
    41: "DOMINGO DE PENTECOSTES - A - SEQUÊNCIA",
    42: "DOMINGO DEPOIS DE PENTECOSTES - A - SOLENIDADE DA SANTÍSSIMA TRINDADE - DEUS É COMUNIDADE DE AMOR",
    43: "QUINTA-FEIRA DEPOIS DA SANTÍSSIMA TRINDADE - A - SOLENIDADE DO SANTÍSSIMO CORPO E SANGUE DE CRISTO - CRISTO PERMANECE CONOSCO NO SINAL DA SUA PÁSCOA",
    45: "SEXTA-FEIRA APÓS O 2º. DOMINGO DEPOIS DE PENTECOSTES - A - SOLENIDADE DO SAGRADO CORAÇÃO DE JESUS - DEUS NOS AMA COM CORAÇÃO DE HOMEM",
    55: "11º. DOMINGO DO TEMPO COMUM - A - UM POVO DE SACERDOTES",
    63: "19º. DOMINGO DO TEMPO COMUM - A - O DEUS PERTO DE NÓS",
    71: "27º. DOMINGO DO TEMPO COMUM - A - O JUÍZO DE DEUS SOBRE SEU POVO",
    78: "34º. OU ÚLTIMO DOMINGO DO TEMPO COMUM - A - JESUS CRISTO, REI DO UNIVERSO - CRISTO, REI DOS TEMPOS E DOS HOMENS",
    # ── Ano B ────────────────────────────────────────────────────────────────
    83: NATAL.format(ano="B", missa="DEUS SE FAZ HOMEM POR NÓS - MISSA DA VIGÍLIA"),
    84: NATAL.format(ano="B", missa="MISSA DA NOITE"),
    85: NATAL.format(ano="B", missa="MISSA DA AURORA"),
    86: NATAL.format(ano="B", missa="MISSA DO DIA"),
    90: "(No domingo entre 2 a 8 de janeiro) - EPIFANIA DO SENHOR - B - NA IGREJA CRISTO SE REVELA A TODOS OS POVOS",
    91: "(Domingo entre 9 a 13 de janeiro) - BATISMO DO SENHOR - B - O PAI MANIFESTA A MISSÃO DO FILHO",
    92: "1º. DOMINGO DA QUARESMA - B - CONVERTEI-VOS E CREDE NO EVANGELHO",
    **semana_santa("B", 97),
    120: "DOMINGO DE PENTECOSTES - B - SEQUÊNCIA",
    121: "DOMINGO DEPOIS DE PENTECOSTES - B - SOLENIDADE DA SANTÍSSIMA TRINDADE - PROTAGONISTAS DA SALVAÇÃO DOS HOMENS",
    122: "QUINTA FEIRA APÓS A FESTA DA SS. TRINDADE - B - SOLENIDADE DO SANTÍSSIMO CORPO E SANGUE DE CRISTO - O SACRIFÍCIO DA NOVA ALIANÇA",
    123: "SEQUÊNCIA - B - SOLENIDADE DO CORPO E SANGUE DE CRISTO",
    124: "SEXTA-FEIRA APÓS O 2º. DOMINGO DEPOIS DE PENTECOSTES - B - SOLENIDADE DO SAGRADO CORAÇÃO DE JESUS - SÓ DEUS AMA ASSIM",
    157: "34º. DOMINGO DO TEMPO COMUM - B - SOLENIDADE DE NOSSO SENHOR JESUS CRISTO, REI DO UNIVERSO - CRISTO SENHOR TORNA LIVRES OS HOMENS",
    # ── Ano C ────────────────────────────────────────────────────────────────
    158: "1º. DOMINGO DO ADVENTO - C - A REDENÇÃO ESTÁ PRÓXIMA",
    159: "2º. DOMINGO DO ADVENTO - C - TODOS OS HOMENS ENCONTRARÃO O DEUS QUE SALVA",
    162: NATAL.format(ano="C", missa="DEUS SE FAZ HOMEM POR NÓS - MISSA DA VIGÍLIA"),
    163: NATAL.format(ano="C", missa="MISSA DA NOITE"),
    164: NATAL.format(ano="C", missa="MISSA DA AURORA"),
    165: NATAL.format(ano="C", missa="MISSA DO DIA"),
    168: "2º. DOMINGO DEPOIS DO NATAL - C",
    169: "(No domingo entre 2 a 8 de janeiro) - EPIFANIA DO SENHOR - C - NA IGREJA CRISTO SE REVELA A TODOS OS POVOS",
    170: "(Domingo entre 9 a 13 de janeiro) - BATISMO DO SENHOR - C - O PAI MANIFESTA A MISSÃO DO FILHO",
    173: "3º. DOMINGO DA QUARESMA - C - DEUS NÃO NOS SALVA SEM NÓS",
    **semana_santa("C", 175),
    196: "DOMINGO DE PENTECOSTES - C - A IGREJA VIVE NO ESPÍRITO SANTO - MISSA DA VIGÍLIA",
    198: "DOMINGO DE PENTECOSTES - C - SEQUÊNCIA",
    199: "DOMINGO DEPOIS DE PENTECOSTES - C - SOLENIDADE DA SANTÍSSIMA TRINDADE - DEUS SEMPRE SE DÁ A CONHECER AOS HOMENS",
    200: "QUINTA-FEIRA DEPOIS DA SANTÍSSIMA TRINDADE - C - SOLENIDADE DO SANTÍSSIMO CORPO E SANGUE DE CRISTO - O PÃO E O VINHO PARA A VIDA DOS HOMENS",
    201: "SEQUÊNCIA - C - SOLENIDADE DO CORPO E SANGUE DE CRISTO",
    202: "SEXTA-FEIRA APÓS O 2º. DOMINGO DEPOIS DE PENTECOSTES - C - SOLENIDADE DO SAGRADO CORAÇÃO DE JESUS - O AMOR QUE SALVA OS QUE NÃO AMAM",
    207: "6º. DOMINGO DO TEMPO COMUM - C - UM ANÚNCIO QUE TRANSFORMA O MUNDO: AS BEM-AVENTURANÇAS",
    # O próprio livro traz "TRANSFORMADAA" e "- Ç -"; corrigidos aqui.
    208: "7º. DOMINGO DO TEMPO COMUM - C - UMA COMUNIDADE TRANSFORMADA PELO AMOR",
    211: "10º. DOMINGO DO TEMPO COMUM - C - CRISTO QUE VENCE A MORTE É A SALVAÇÃO",
    235: "34º. OU ÚLTIMO DOMINGO DO TEMPO COMUM - C - JESUS CRISTO, REI DO UNIVERSO: CRISTO, SENHOR DA PAZ E DA UNIDADE",
    # ── Solenidades e festas ─────────────────────────────────────────────────
    # O CSV tinha o cabeçalho da seção ("O MISTÉRIO DE CRISTO NA VIDA DA IGREJA").
    236: "8 de dezembro - IMACULADA CONCEIÇÃO DE NOSSA SENHORA",
    238: "24 de junho - NATIVIDADE DE SÃO JOÃO BATISTA - MISSA DA VIGÍLIA",
    239: "24 de junho - NATIVIDADE DE SÃO JOÃO BATISTA - MISSA DO DIA",
    240: "29 de junho - SÃO PEDRO E SÃO PAULO, APÓSTOLOS - MISSA DA VIGÍLIA",
    241: "29 de junho - SÃO PEDRO E SÃO PAULO, APÓSTOLOS - MISSA DO DIA",
    242: "6 de agosto - TRANSFIGURAÇÃO DO SENHOR",
    243: "15 de agosto - ASSUNÇÃO DE NOSSA SENHORA - MISSA DA VIGÍLIA",
    244: "15 de agosto - ASSUNÇÃO DE NOSSA SENHORA - MISSA DO DIA",
    246: "12 de outubro - NOSSA SENHORA DA CONCEIÇÃO APARECIDA - PADROEIRA DO BRASIL",
    248: FINADOS.format(parte="I MISSA"),
    249: FINADOS.format(parte="II MISSA"),
    # O CSV repetia "II MISSA"; a página é a III.
    250: FINADOS.format(parte="III MISSA"),
    251: FINADOS.format(parte="SALMO RESPONSORIAL (IV) - Sl 23(22)"),
    252: FINADOS.format(parte="SALMO RESPONSORIAL (V) - Sl 130(129)"),
    253: FINADOS.format(parte="SALMO RESPONSORIAL (VI) - Sl 115(114)"),
}

# O 5º Domingo da Quaresma C (pág. 184) não tem linha: ficou colado no 4º
# (nº174), que dizia ocupar as páginas 183-184 do livro (190-191 do PDF).
ENTRADA_FALTANTE = {
    "numero": "256",
    "pagina_livro": "184",
    "titulo": "5º. DOMINGO DA QUARESMA - C - VAI E NÃO PEQUES MAIS",
    "ano": "C",
    "salmo": "Sl 126(125)",
    "compositor": "MTK",
    "paginas": "191",
    "arquivo": "174_4º_DOMINGO_DA_QUARESMA_-_C.pdf",
}
PAGINAS_CORRIGIDAS = {"174": "190"}

# Compositor lido página a página no livro (sigla acima da pauta). O CSV tinha
# 151 linhas vazias, lixo de extração em duas ("Pe TT pra \"A", "Pe e") e três
# erradas: as Primeiras Leituras da Vigília (nº22, 101, 179) são de A.Z. nos três
# anos, não de M.T.K. Os nomes seguem a grafia já usada no banco.
MIRIA_KOLLING = "Ir. Míria T. Kolling"
ANDRE_ZAMUR = "André Zamur"
LINHAS_ANDRE_ZAMUR = {
    22, 48, 50, 51, 55, 56, 57, 58, 63, 64, 66, 71, 72, 73, 74, 75, 79, 80, 81, 82,
    92, 93, 94, 95, 96, 101, 112, 113, 114, 115, 116, 121, 122, 124, 125, 126,
    131, 132, 133, 134, 140, 141, 142, 143, 144, 149, 150, 151, 152, 153, 157, 179,
}
# Nas Primeiras Leituras da Vigília o PDF tem duas páginas: o salmo principal é de
# A.Z. e o alternativo "Ou Sl 33(32)", na página seguinte, é de M.T.K.
LINHAS_DOIS_AUTORES = {22, 101, 179}


def main() -> None:
    origem, destino, diferencas = sys.argv[1:4]
    linhas = list(csv.DictReader(io.open(origem, encoding="utf-8-sig"), delimiter=";"))
    campos = list(linhas[0].keys())

    mudancas = []
    for linha in linhas:
        numero = int(linha["numero"])
        novo = TITULOS.get(numero)
        if novo and novo != linha["titulo"]:
            mudancas.append((linha["numero"], linha["titulo"], novo))
            linha["titulo"] = novo
        if linha["numero"] in PAGINAS_CORRIGIDAS:
            linha["paginas"] = PAGINAS_CORRIGIDAS[linha["numero"]]

    linhas.append(ENTRADA_FALTANTE)

    for linha in linhas:
        numero = int(linha["numero"])
        if numero in LINHAS_DOIS_AUTORES:
            linha["compositor"] = f"{ANDRE_ZAMUR}, {MIRIA_KOLLING}"
        elif numero in LINHAS_ANDRE_ZAMUR:
            linha["compositor"] = ANDRE_ZAMUR
        else:
            linha["compositor"] = MIRIA_KOLLING
    mudancas.append(("256", "(não existia)", ENTRADA_FALTANTE["titulo"]))

    with io.open(destino, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=campos, delimiter=";")
        w.writeheader()
        w.writerows(linhas)

    with io.open(diferencas, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh, delimiter=";")
        w.writerow(["numero", "titulo_original", "titulo_corrigido"])
        w.writerows(mudancas)

    titulos = [l["titulo"] for l in linhas]
    repetidos = sorted({t for t in titulos if titulos.count(t) > 1})

    print(f"linhas: {len(linhas)} | títulos alterados: {len(mudancas) - 1} | entrada nova: 1")
    autores = [l["compositor"] for l in linhas]
    for nome in sorted(set(autores)):
        print(f"compositor: {autores.count(nome):>3}  {nome}")
    print(f"títulos repetidos restantes: {len(repetidos)}")
    for t in repetidos:
        print(f"   {titulos.count(t)}x {t}")


if __name__ == "__main__":
    main()
