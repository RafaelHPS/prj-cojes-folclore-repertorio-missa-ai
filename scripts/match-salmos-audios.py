"""
Casa cada salmo do CSV corrigido com a faixa de áudio correspondente na pasta
compartilhada do Dropbox e emite um relatório de conferência. NÃO grava nada.

As pastas seguem a ordem do livro, mas não o nome delas: "Ano A - Vol. II" traz
no fim faixas do Ano B, e as solenidades aparecem gravadas duas vezes (Ano B Vol
II e Ano C Vol II). Por isso o casamento é por SEGMENTOS explícitos — faixas
consecutivas de uma pasta contra linhas consecutivas do livro — e cada par é
validado pelos nomes: ordinal do domingo, tempo litúrgico, leitura da Vigília,
solenidade. Um par que não passa é reportado, nunca aplicado em silêncio.

Uso:
    python scripts/match-salmos-audios.py <salmos_corrigido.csv> <salmos_audios_dropbox.txt> <relatorio.csv>
"""

import csv
import io
import re
import sys
import unicodedata
from urllib.parse import quote

BASE = "https://www.dropbox.com/scl/fo/ds14toc0x5kn5t1vuejdv/"

# Faixa "alternativa" do salmo da 1ª leitura da Vigília ("Ou Sl 33(32)"). O PDF
# dessas linhas já traz as duas opções, mas o campo de áudio comporta um link só:
# fica a faixa principal.
ALT = "ALT"

# (pasta, faixa_inicial, faixa_final, linhas do CSV na mesma ordem)
SEGMENTOS = [
    # Ano A
    (0, 1, 41, [*range(1, 9), 255, *range(9, 23), ALT, *range(23, 40)]),
    (2, 1, 39, list(range(40, 79))),
    # Ano B
    (1, 1, 47, [*range(79, 102), ALT, *range(102, 125)]),
    (3, 1, 33, list(range(125, 158))),
    # Ano C
    (4, 1, 50, [*range(158, 175), 256, *range(175, 180), ALT, *range(180, 206)]),
    # inclui as solenidades (faixas 31-49), que são as mesmas usadas nos salmos já
    # cadastrados (págs. 254, 259 e 260)
    (5, 1, 49, list(range(206, 255))),
]

ORDINAIS_LEITURA = {
    "PRIMEIRA": 1, "SEGUNDA": 2, "TERCEIRA": 3, "QUARTA": 4,
    "QUINTA": 5, "SEXTA": 6, "SETIMA": 7,
}

CATEGORIAS = {
    "ADVENTO": r"ADVENTO",
    "QUARESMA": r"QUARESMA",
    "PASCOA": r"PASCOA",
    "TEMPO_COMUM": r"TEMPO COMUM|\bT ?C\b",
    "NATAL": r"NATAL",
    "VIGILIA": r"VIGILIA",
    "NOITE": r"NOITE",
    "AURORA": r"AURORA",
    "MISSA_DO_DIA": r"MISSA DO DIA",
    "SAGRADA_FAMILIA": r"SAGRADA FAMILIA",
    "MAE_DE_DEUS": r"MAE DE DEUS",
    "EPIFANIA": r"EPIFANIA",
    "BATISMO": r"BATISMO",
    "RAMOS": r"RAMOS",
    "CRISMA": r"CRISMA",
    "CEIA": r"CEIA",
    "SEXTA_SANTA": r"SEXTA ?FEIRA (SANTA|DA PAIXAO)",
    "NOVO_TESTAMENTO": r"NOVO TESTAMENTO|\bN ?T\b",
    "SEQUENCIA": r"SE[N]?QU",
    "ASCENSAO": r"ASCEN",
    "PENTECOSTES": r"PENTECOST",
    "TRINDADE": r"TRINDADE",
    "CORPO_E_SANGUE": r"CORPO E SANGUE",
    "SAGRADO_CORACAO": r"CORACAO",
    "IMACULADA": r"IMACULADA",
    "APRESENTACAO": r"APRESENTACAO",
    "JOAO_BATISTA": r"JOAO BATISTA|\bSJB\b",
    "PEDRO_E_PAULO": r"PEDRO|\bSP E SP\b",
    "TRANSFIGURACAO": r"TRANSFIGURA",
    "ASSUNCAO": r"ASSUN",
    "EXALTACAO": r"EXALTACAO",
    "APARECIDA": r"APARECIDA",
    "TODOS_OS_SANTOS": r"TODOS OS SANTOS",
    "LATRAO": r"LATRAO",
}


def normalizar(texto: str) -> str:
    texto = re.sub(r"[ºª°]", "", texto)
    sem_acento = "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )
    return re.sub(r"\s+", " ", re.sub(r"[^A-Z0-9()]+", " ", sem_acento.upper())).strip()


def assinatura(texto: str, eh_faixa: bool) -> tuple:
    """Categorias litúrgicas + ordinal do domingo + nº da leitura + nº da missa/salmo."""
    t = normalizar(texto)
    if eh_faixa:
        t = re.sub(r"^\d+ ", "", t)  # tira o número da faixa

    cats = {nome for nome, padrao in CATEGORIAS.items() if re.search(padrao, t)}

    domingo = None
    padrao_domingo = r"(\d+) ?O? (DOMINGO|DOM)\b" if eh_faixa else r"^(\d+) (OU ULTIMO )?DOMINGO\b"
    achado = re.search(padrao_domingo, t)
    if achado:
        domingo = int(achado.group(1))

    leitura = None
    achado = re.search(r"\b(\d) ?(A )?LEIT", t)
    if achado:
        leitura = int(achado.group(1))
    for palavra, n in ORDINAIS_LEITURA.items():
        if re.search(rf"\b{palavra} LEITURA", t):
            leitura = n

    romano = None
    achado = re.search(r"\bMISSA (I{1,3})\b|\b(I{1,3}) MISSA\b", t)
    if achado:
        romano = "MISSA " + (achado.group(1) or achado.group(2))
    achado = re.search(r"RE+SPONSORIAL \(?(IV|VI|V)\)?", t)
    if achado:
        romano = "SALMO " + achado.group(1)

    return cats, domingo, leitura, romano


def validar(titulo: str, faixa: str) -> tuple:
    cats_t, dom_t, leit_t, rom_t = assinatura(titulo, eh_faixa=False)
    cats_f, dom_f, leit_f, rom_f = assinatura(faixa, eh_faixa=True)

    problemas = []
    sobrando = cats_f - cats_t
    if sobrando:
        problemas.append(f"faixa fala de {sorted(sobrando)} e o título não")
    if dom_f is not None and dom_f != dom_t:
        problemas.append(f"domingo {dom_f} na faixa x {dom_t} no título")
    if leit_f is not None and leit_f != leit_t:
        problemas.append(f"leitura {leit_f} na faixa x {leit_t} no título")
    if rom_f is not None and rom_f != rom_t:
        problemas.append(f"{rom_f} na faixa x {rom_t} no título")
    if problemas:
        return "FALHA", "; ".join(problemas)

    # Passa, mas sem prova positiva: o título tem SEQUÊNCIA e a faixa não diz.
    if "SEQUENCIA" in cats_t and "SEQUENCIA" not in cats_f:
        return "provavel", "título é sequência; a faixa não diz, casou pela posição"
    return "ok", ""


def carregar_faixas(caminho: str):
    rlkey, pastas, faixas = None, {}, {}
    for linha in io.open(caminho, encoding="utf-8"):
        linha = linha.rstrip("\n")
        if not linha or linha.startswith("#"):
            continue
        if linha.startswith("@rlkey="):
            rlkey = linha.split("=", 1)[1]
        elif linha.startswith("@pasta="):
            idx, nome = linha.split("=", 1)[1].split("|", 1)
            pastas[int(idx)] = nome
        else:
            idx, id_arquivo, nome = linha.split("|", 2)
            numero = int(re.match(r"(\d+)", nome).group(1))
            faixas[(int(idx), numero)] = (id_arquivo, nome)
    return rlkey, pastas, faixas


def url_da_faixa(rlkey, pasta, id_arquivo, nome) -> str:
    seg = lambda s: quote(s, safe="")
    return f"{BASE}{id_arquivo}/Salmos/{seg(pasta)}/{seg(nome)}?rlkey={rlkey}&dl=0"


def main() -> None:
    caminho_csv, caminho_faixas, caminho_saida = sys.argv[1:4]
    linhas = {
        l["numero"]: l
        for l in csv.DictReader(io.open(caminho_csv, encoding="utf-8-sig"), delimiter=";")
    }
    rlkey, pastas, faixas = carregar_faixas(caminho_faixas)

    saida, usadas = [], set()
    for pasta, ini, fim, destino in SEGMENTOS:
        numeros = list(range(ini, fim + 1))
        assert len(numeros) == len(destino), f"segmento da pasta {pasta} desalinhado"
        for n_faixa, numero_csv in zip(numeros, destino):
            id_arquivo, nome = faixas[(pasta, n_faixa)]
            usadas.add((pasta, n_faixa))
            if numero_csv == ALT:
                continue
            linha = linhas[str(numero_csv)]
            status, motivo = validar(linha["titulo"], nome)
            saida.append({
                "numero": linha["numero"],
                "pagina_livro": linha["pagina_livro"],
                "titulo": linha["titulo"],
                "pasta": pastas[pasta],
                "faixa": nome,
                "status": status,
                "motivo": motivo,
                "audio_url": url_da_faixa(rlkey, pastas[pasta], id_arquivo, nome),
            })

    saida.sort(key=lambda r: int(r["pagina_livro"]))
    with io.open(caminho_saida, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(saida[0].keys()), delimiter=";")
        w.writeheader()
        w.writerows(saida)

    cobertas = {r["numero"] for r in saida}
    sem_audio = sorted(set(linhas) - cobertas, key=int)
    nao_usadas = sorted(set(faixas) - usadas)

    contagem = {}
    for r in saida:
        contagem[r["status"]] = contagem.get(r["status"], 0) + 1
    print(f"linhas casadas: {len(saida)} de {len(linhas)} | sem áudio: {sem_audio or 'nenhuma'}")
    print("validação:", contagem)
    for r in saida:
        if r["status"] != "ok":
            print(f"   [{r['status']}] pág {r['pagina_livro']:>3} | {r['faixa']} | {r['motivo']}")
    print(f"faixas não usadas: {len(nao_usadas)}")
    for pasta, n in nao_usadas:
        print(f"   {pastas[pasta]} / {faixas[(pasta, n)][1]}")
    print(f"\nrelatório: {caminho_saida}")


if __name__ == "__main__":
    main()
