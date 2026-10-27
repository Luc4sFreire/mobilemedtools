import { useEffect, useRef, useState } from "react"
import { useNotifications } from "./useNotifications"
import { useSingleSignature } from "./useSingleSignature"
import { combineSignatures } from "../utils/combineSignatures"

export function useSignature() {
  const { notifySuccess, notifyError } = useNotifications()
  const [addSecondSig, setAddSecondSig] = useState(false)
  const [signatureGap, setSignatureGap] = useState(0)
  const [signaturePadding, setSignaturePadding] = useState(4)

  const sig1 = useSingleSignature(notifyError)
  const sig2 = useSingleSignature(notifyError, { allowReadyImage: true })

  // ---- preview combinado ----
  const combinedUrlRef = useRef("")
  const combinedOutputUrlRef = useRef("")
  const [combinedResult, setCombinedResult] = useState({
    key: "",
    previewUrl: "",
    outputUrl: "",
    error: "",
  })
  const combineKey = JSON.stringify([
    sig1.previewUrl,
    sig2.previewUrl,
    signatureGap,
    signaturePadding,
  ])
  const combinedTransparent =
    sig1.imageOptions.transparente && sig2.imageOptions.transparente
  const hasBothCurrentPreviews =
    addSecondSig && sig1.hasCurrentPreview && sig2.hasCurrentPreview
  const combinedPreviewUrl = hasBothCurrentPreviews && combinedResult.key === combineKey
    ? combinedResult.previewUrl
    : ""
  const combinedOutputUrl = hasBothCurrentPreviews && combinedResult.key === combineKey
    ? combinedResult.outputUrl
    : ""
  const combineError = hasBothCurrentPreviews && combinedResult.key === combineKey
    ? combinedResult.error
    : ""
  const isCombining = hasBothCurrentPreviews && combinedResult.key !== combineKey

  useEffect(() => {
    if (!hasBothCurrentPreviews) return
    if (combinedResult.key === combineKey) return

    let cancelled = false

    combineSignatures(sig1.previewUrl, sig2.previewUrl, {
      gap: signatureGap,
      padding: signaturePadding,
      transparent: combinedTransparent,
    })
      .then((blob) => {
        if (cancelled) return
        const previewUrl = URL.createObjectURL(blob.previewBlob)
        const outputUrl = URL.createObjectURL(blob.outputBlob)
        if (combinedUrlRef.current) URL.revokeObjectURL(combinedUrlRef.current)
        if (combinedOutputUrlRef.current) URL.revokeObjectURL(combinedOutputUrlRef.current)
        combinedUrlRef.current = previewUrl
        combinedOutputUrlRef.current = outputUrl
        setCombinedResult({ key: combineKey, previewUrl, outputUrl, error: "" })
      })
      .catch((error) => {
        if (cancelled) return
        if (combinedUrlRef.current) URL.revokeObjectURL(combinedUrlRef.current)
        if (combinedOutputUrlRef.current) URL.revokeObjectURL(combinedOutputUrlRef.current)
        combinedUrlRef.current = ""
        combinedOutputUrlRef.current = ""
        const message = error instanceof Error ? error.message : "O navegador não conseguiu combinar as imagens."
        setCombinedResult({ key: combineKey, previewUrl: "", outputUrl: "", error: message })
        notifyError("Falha ao combinar assinaturas.", message)
      })

    return () => {
      cancelled = true
    }
  }, [
    addSecondSig,
    sig1.previewUrl, sig1.hasCurrentPreview,
    sig2.previewUrl, sig2.hasCurrentPreview,
    hasBothCurrentPreviews,
    combineKey,
    combinedResult.key,
    signatureGap,
    signaturePadding,
    combinedTransparent,
    notifyError,
  ])

  useEffect(() => () => {
    if (combinedUrlRef.current) URL.revokeObjectURL(combinedUrlRef.current)
    if (combinedOutputUrlRef.current) URL.revokeObjectURL(combinedOutputUrlRef.current)
  }, [])

  // ---- download ----
  const finalPreviewUrl = addSecondSig ? combinedOutputUrl : sig1.previewUrl
  const finalDisplayUrl = addSecondSig ? combinedPreviewUrl : sig1.previewUrl
  const canDownload =
    addSecondSig
      ? Boolean(combinedPreviewUrl) && !isCombining && !combineError
      : sig1.hasCurrentPreview && !sig1.isProcessing && !sig1.isComposing
  const hasCurrentPreview = addSecondSig
    ? Boolean(combinedPreviewUrl) && !isCombining && !combineError
    : sig1.hasCurrentPreview

  function downloadSignature() {
    if (!canDownload) return
    try {
      const link = document.createElement("a")
      const baseName = sig1.professionalName || "assinatura"
      const suffix = addSecondSig ? "-dupla" : ""
      link.href = finalPreviewUrl
      link.download = `Assinatura-${baseName}${suffix}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      notifySuccess("Download iniciado!", "A assinatura está sendo salva em PNG.")
    } catch {
      notifyError("Não foi possível baixar a assinatura.", "Tente novamente.")
    }
  }

  return {
    addSecondSig, setAddSecondSig,
    signatureGap, setSignatureGap,
    signaturePadding, setSignaturePadding,
    sig1, sig2,
    // preview final (o componente deve usar ESTE)
    previewUrl: finalDisplayUrl,
    hasCurrentPreview,
    isProcessing: sig1.isProcessing || (addSecondSig && sig2.isProcessing) || isCombining,
    isComposing:
      sig1.isComposing ||
      (addSecondSig && sig2.isComposing) ||
      isCombining,
    canDownload,
    downloadSignature,
    notifySuccess,
  }
}