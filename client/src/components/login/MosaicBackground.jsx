import './MosaicBackground.css'

// =============================================================================
// MosaicBackground — Cinematic photo grid with gradient overlay
// Design spec: docs/design/login/DESIGN.md  §1 Creative North Star
//
// Images: replace PHOTOS array with your own assets before going to production.
// Current URLs are temporary CDN placeholders from the design mockup.
// =============================================================================

const PHOTOS = [
  { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAza4QEXidhZId8211eaEI-yMeWlHSHzIklfkEwNEwHxc-nKRZ7QiAjd2oBDFgNRd_PTLcFN7JW0nsRuo9ZhCr0NhBXFisdKfN-iYUNQufJJ9Bshdg7llH-ivUkEv2fq-4SUJs83UBssVgPMbdNAPTm9K_n03xMH4qWXmTixEs0Zr_LjmNlT19tAYpLZ334EOC3vdFsgi4SACddTyfgKsQWtb2Tq7M6BsANNymprRGKdt1xc0fGjmvkl9OCJ-zJd6L3BO6APYBlxeLD', alt: 'Creative team collaborating in a sunlit office' },
  { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWaICjIu2MRTDLQVv3Wx4TrfZsPeiIwAZ0uRFEEUDFgbKCDFi8MCHyJF5GRskzTq1o844sruUNczHFd2YMY7urW7lsaqqC7mHmKABP3BZ1Be2eF7Atk2AiBuD5zXckEQo5rvtWwW4WC0RqEP6prYVJpXVVe_jCKcQmnAk_ExLxMLXDXiMLpD4I_8ofM7b9tEb3P1ewoRtrRQ8qAkH2YnEGf6EC041l4W4sEIelDIi0cV7FefHJto_LemLayUyyYHhtDUlfLzrsApqf', alt: 'Professional woman leading a presentation' },
  { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7D9a9yHdpNDtm9y0fkmTEVr78TWXGipkBF4Oh06rFWZ5UNzfoNp0w2Su-03mikLPkbP_UZ2BROimdo236SLMDODlCxzssbMEQRGXUhEqu8dMq0qyGMnYZZ5ZtAIEwyyozb3NKhZO-8pp1ZYRRCI8kq2XfZv7jw6eLjfyVZC7LVEg5JRJGfVUEWr96WpFLfz15JlnQSEWtBtRG5JMJcTdV9BvlanAsvRWftViTlkHPyx0htUbLkdeRqFkhyRc93Dd7jmD4pYqjkbuN', alt: 'Mature executive in a high-end lobby' },
  { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA241W61jq7F_9XF1BEKmC3GgHVFOvMqqmgkv2ulqvPCJQHCIEHryT8jS_Kmkj9UbuVyu28qBv2I-jk-9tseAQ_Cl9CAO12SJWcaGW_CGsDOVjmJKUpK-OgkfGRalloqa_hoF2SiZ1DNMDo42nFLu3Drpc4ZB0Dp73hRVYy-2TXCzy4LqcHaWpU3l3TttWioC5xfsuZkMh9_3rkdXEdll6fMd9ST6OvCg1ZkNW2js-X79tv9_hUUcs_nFXtJkA7nP3-_0hnU3MEUbCn', alt: 'Engineers in a high-tech laboratory' },
  { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcpSV9FpGFPDnK-pIUNxxsulH5nXvNqX_lmryyyujBXJKpH2GiZk_dsTuoFtHjnLEhRF6S1CpKp8JthWh43LVPZm_0Axvf9nwMkttXowPthU5G_Zgq1NDHb2AUUSEpBPykR82H1U6YPNhCUYMMOtGSBzZ7DRtqqZBrBi14Zznp8mIzqYzFYdbnpB8vgFHzt_F7gG2eK_aUEuVKBal1etzyWnTQ3svYLCLgZSNJpLJcp0YM6pGHsXbx2CzohmTfHPR8p63BkAVtOKZK', alt: 'Two colleagues laughing in a corporate lounge' },
  { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDVFnNsEdKs7Qrn-6bKFZqSO3QZmo0wJW9_QZSddmXpnLzsY8hv_aXWMQXeuSeUNB8rReC-aNJcL5reeVaiRahcmcSkJ4XkN0X7eFxp1odqjrbq2nXkW4RPE6f-JtFoNSuccHklrEo84Av1dm8rOhBDj17PjCiLoyulDybPejFpunJ8lGJGwRAZO8v0nJHIqgj2vUM_lI-ZlZ-PRJLKZMqDU_dudHlmg8Lc7tq770U-jaUwunOxSqauwTgjBCjbr0vh_-uGkfvGsyUx', alt: 'Brainstorming session with sticky notes' },
  { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOW9GnE1STNfX8x8QC4GqWS9B9O5eVZh317d-8p9shTgeBgALb0eE8lroIaVnz9RRwdKS1bZ1FcF_x2hvi1BdZLLxz4i2ab1u2nnwSHc80Pc3hxmI5g62W5Obewpq9dzfvQKcaLbEanzkqheQ4GqomZlOyowOdQQ0pzS1W7CxCbeCRs6Yp_GR3h3B0_QE-Ak1-UGKfbGc38gCUzuiGndzrIOSsLHWkf1TGiS973nTxmPPsznTfmwiEm9IvkjeBCeeggl1W1wD9vatj', alt: 'Analyst working on data visualizations' },
  { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBiSNnAIhxpJxKOSYNMOqx61a8PHEXATxMHcytEGDQoOoTY5HHQ5rgIyiR9S_TXOaDkSnbmaomhju-QMxaZYm7-1DHiKOzXiIxkR2ANJRjpuRql2nfj9ok4YP7njnUhZVEhzhiy8yv1IZ21MjGGY9PmMap72zYJ7_UCtVyHZAjqARzlm0o7yNSx1DHsHDFnqzrF93-fbclz6A410byqw1jWicPa0XUH9Po1-LVMfkYUPCgVgxadMrUfgbjSTPvJz53w0KBmdi0ULUJ0', alt: 'Corporate reception with digital art display' },
  { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVURNAMh56WIyJhDVIv6Fc-RMkUxUSV9qNBm7XaeMaj7K36kwEFaBH0fjX9ktKq0_T71c9d3iooCx4c9pRxpzKs7NdhKs0tb8kmut_uT0esw1ZBhjzSA0XNG2S86urEDMDBSKGK6iGdLzNRuhn-yHgglI-rGa2KDL4gZoJpaqSL5M3NUNym4pTi8vAy7JE3crD1CKACrFipYRhFv7d7K2Trdyl6L7_55-OWzkEXJxXMbySNvS_vqCM7cyd7dGs9bMe0cY3IAjjOMLN', alt: 'Long modern office hallway' },
  { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCqsmwlrU1hu3sbjWLIUjObYe4XtgGQzvzNtm31cNSCvUf9rHZAeT_Bo_tJm9F64NrvnToXirMUyQuMXUNAHyuD3S-eAD_glDbXgzkMknrU6l2KxUiJh8lNFLwdI4zXCKj14S4p-SCGug_koYrkGVeugH6QDWfCoanLxWamr9d2WXB8z3nJQQxlFlF7Owhz82Zof0iv7cMLHYhVCvQBoqlTmYzKNINJFLScoElgPgBb6jn0nLCVM3abbE1zngwtbGXMGsxtjHrHE20c', alt: 'Businessman in upscale corporate environment' },
]

export default function MosaicBackground() {
  return (
    <>
      {/* Photo grid */}
      <div className="mosaic" aria-hidden="true">
        {PHOTOS.map((photo, i) => (
          <div key={i} className="mosaic__cell">
            <img src={photo.src} alt={photo.alt} className="mosaic__img" loading="lazy" />
          </div>
        ))}
      </div>

      {/* Gradient overlay */}
      <div className="mosaic__overlay" aria-hidden="true" />
    </>
  )
}
