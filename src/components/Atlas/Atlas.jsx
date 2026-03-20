/**
 * Atlas — grille des 14 habitats vernaculaires relevés.
 * Onglet 3 de la sidebar. Clic → centre carte + ouvre hub relevé.
 */

const COUNTRY_FR = {
  IT: 'Italie',
  GR: 'Grèce',
  TR: 'Turquie',
  GE: 'Géorgie',
  AM: 'Arménie',
  UZ: 'Ouzbékistan',
  KG: 'Kirghizstan',
  CN: 'Chine',
  JP: 'Japon',
}

export default function Atlas({ darkMode, steps, meta, onStepClick }) {
  // Filtrer les étapes-relevés et extraire les habitats
  const habitats = []
  if (steps) {
    for (const step of steps) {
      if (step.is_releve && step.releves?.length > 0) {
        for (const releve of step.releves) {
          habitats.push({
            stepId: step.id,
            step,
            habitat_type: releve.habitat_type,
            village: releve.village || step.location?.city || '',
            country_code: step.location?.country_code || '',
            zone: step.zone,
            representations: releve.representations || {},
          })
        }
      }
    }
  }

  // Theme
  const textPrimary = darkMode ? '#d0d0d0' : '#2a2a2a'
  const textSecondary = darkMode ? '#999' : '#777'
  const cardBg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'
  const cardHover = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
  const cardBorder = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const badgeBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const badgeText = darkMode ? '#aaa' : '#666'

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ color: textPrimary }}
    >
      {/* En-tête */}
      <div style={{ padding: '20px 20px 8px' }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '0.02em',
            margin: 0,
          }}
        >
          Atlas des habitats vernaculaires
        </h2>
        <p
          style={{
            fontSize: 12,
            color: textSecondary,
            margin: '6px 0 0',
            lineHeight: 1.5,
          }}
        >
          {habitats.length} relevés architecturaux le long de la Route de la Soie
        </p>
      </div>

      {/* Grille */}
      <div style={{ padding: '12px 16px 24px' }}>
        {habitats.map((h, i) => {
          const zoneColor = meta?.zones?.[h.zone]?.color || '#9CA3AF'
          const countryFr = COUNTRY_FR[h.country_code] || h.country_code

          return (
            <button
              key={`${h.stepId}-${i}`}
              onClick={() => onStepClick?.(h.step)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = cardHover
                e.currentTarget.style.borderColor = zoneColor
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = cardBg
                e.currentTarget.style.borderColor = cardBorder
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: 6,
                padding: '14px 14px 12px',
                marginBottom: 8,
                cursor: 'pointer',
                transition: 'background 150ms, border-color 200ms',
              }}
            >
              {/* Ligne 1 : numéro + habitat */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: zoneColor,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: textPrimary,
                    fontFamily: "'Source Serif 4', Georgia, serif",
                  }}
                >
                  {h.habitat_type}
                </span>
              </div>

              {/* Ligne 2 : pays + village */}
              <div
                style={{
                  fontSize: 12,
                  color: textSecondary,
                  marginTop: 6,
                  paddingLeft: 30,
                }}
              >
                {countryFr} — {h.village}
              </div>

              {/* Ligne 3 : représentations */}
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  marginTop: 8,
                  paddingLeft: 30,
                }}
              >
                {h.representations.coupe && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 7px',
                      borderRadius: 3,
                      background: badgeBg,
                      color: badgeText,
                    }}
                  >
                    Coupe
                  </span>
                )}
                {h.representations.schema && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 7px',
                      borderRadius: 3,
                      background: badgeBg,
                      color: badgeText,
                    }}
                  >
                    Schéma
                  </span>
                )}
                {h.representations.model_3d && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 7px',
                      borderRadius: 3,
                      background: badgeBg,
                      color: badgeText,
                    }}
                  >
                    3D
                  </span>
                )}
                {h.representations.croquis && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 7px',
                      borderRadius: 3,
                      background: badgeBg,
                      color: badgeText,
                    }}
                  >
                    Croquis
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
