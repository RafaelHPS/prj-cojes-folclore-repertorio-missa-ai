import { useEffect, useRef } from 'react'

/**
 * Faz o botão "voltar" do navegador/celular fechar o modal em vez de sair da página.
 * Empurra uma entrada no histórico ao abrir e a remove ao fechar pelo X.
 */
export function useCloseOnBack(onClose: () => void): void {
  const onCloseRef = useRef(onClose)
  const closedByBack = useRef(false)
  const pendingBackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    // Em StrictMode (dev), o React roda setup→cleanup→setup deste efeito de
    // propósito. Se um history.back() do cleanup "fantasma" chegasse a
    // disparar, o popstate assíncrono resultante seria capturado pelo
    // listener do segundo setup e fecharia o modal sozinho. Por isso o
    // back() do cleanup é adiado (setTimeout 0) e cancelável: o próximo
    // setup cancela o timer se ainda não disparou (= era só o StrictMode
    // remontando), e só um cleanup "de verdade" (sem setup seguinte) deixa
    // o timer disparar e desfazer o pushState.
    if (pendingBackTimer.current) {
      clearTimeout(pendingBackTimer.current)
      pendingBackTimer.current = null
    }

    window.history.pushState({ modal: 'viewer' }, '')

    function handlePopState() {
      closedByBack.current = true
      onCloseRef.current()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      // Fechou pelo X — remove a entrada que empurramos
      if (!closedByBack.current) {
        pendingBackTimer.current = setTimeout(() => {
          pendingBackTimer.current = null
          window.history.back()
        }, 0)
      }
    }
  }, [])
}
