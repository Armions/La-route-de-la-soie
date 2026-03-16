import { useState, useEffect } from 'react'

/**
 * Loads data_model.json + trip.json, merges Polarsteps descriptions
 * into each step via polarsteps_uuid === uuid.
 *
 * Returns { steps, meta, locations, loading, error }
 */
export default function useStepsData() {
  const [data, setData] = useState({
    steps: null,
    meta: null,
    locations: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    Promise.all([
      fetch('/data/data_model.json').then((r) => r.json()),
      fetch('/data/trip.json').then((r) => r.json()),
      fetch('/data/locations.json').then((r) => r.json()),
    ])
      .then(([dataModel, trip, locData]) => {
        // Index trip steps by uuid for O(1) lookup
        const tripByUuid = {}
        for (const ts of trip.all_steps) {
          tripByUuid[ts.uuid] = ts
        }

        // Merge description from trip.json into each step
        const enrichedSteps = dataModel.steps.map((step) => {
          const tripStep = tripByUuid[step.polarsteps_uuid]
          if (!tripStep) return step

          return {
            ...step,
            description: tripStep.description || step.description || '',
          }
        })

        setData({
          steps: enrichedSteps,
          meta: dataModel.meta,
          locations: locData.locations,
          loading: false,
          error: null,
        })
      })
      .catch((err) => {
        console.error('useStepsData: failed to load data', err)
        setData((prev) => ({ ...prev, loading: false, error: err }))
      })
  }, [])

  return data
}
