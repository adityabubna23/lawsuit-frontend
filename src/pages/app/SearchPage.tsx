import { FC, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LawyerCard from '../../components/molecules/LawyerCard'
import Button from '../../components/atoms/Button'
import { useLawyerStore } from '@/stores/lawyerStore'

interface Filters {
  location?: string
  specialization?: string
  maxFee?: string
  language?: string
}

const SearchPage: FC = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<Filters>({})
  const [page, setPage] = useState(1)

  const {
    lawyers,
    loading,
    total,
    limit,
    filterOptions,
    fetchLawyers,
  } = useLawyerStore((s) => ({
    lawyers: s.lawyers,
    loading: s.loading,
    total: s.total,
    limit: s.limit,
    filterOptions: s.filterOptions,
    fetchLawyers: s.fetchLawyers,
  }))

  // Fetch lawyers based on search and filters (delegated to store)
  const load = async (p = 1) => {
    const mappedFilters: any = {}
    if (searchQuery) mappedFilters.q = searchQuery
    if (filters.location) mappedFilters.location = filters.location
    if (filters.specialization) mappedFilters.specialization = filters.specialization
    if (filters.maxFee) mappedFilters.maxFee = Number(filters.maxFee)
    if (filters.language) mappedFilters.languages = filters.language.split(',').map((s) => s.trim())

    await fetchLawyers(mappedFilters, p, limit)
  }

  useEffect(() => {
    load(page)
  }, [searchQuery, filters, page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    load(1)
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }))
    setPage(1)
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined)

  const removeFilter = (key: keyof Filters) => {
    setFilters(prev => {
      const updated = { ...prev }
      delete updated[key]
      return updated
    })
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Offers banner */}
      <div className="w-full h-40 rounded-xl flex items-center justify-between bg-gradient-to-r from-primary to-midnight text-white mb-4">
        <div className="max-w-7xl sm:mx-auto lg:mx-4 px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
          <div className="text-xl">Limited-time: Get 20% off your first consultation when you book this week!</div>
          <div>
            <a href="/offers" className="text-sm font-semibold underline"></a>
          </div>
        </div>
      </div>
      {/* Search Bar - Fixed at top */}
      <div className="bg-white border-b sticky top-0 z-20 rounded-md shadow-[0_-10px_15px_-3px_rgb(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSearch}>
            <div className="flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lawyers by name or specialization..."
                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <Button variant='secondary' type="submit">Search</Button>
            </div>
          </form>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-2 px-4 sm:px-6 lg:px-6 py-10">
        <div className="grid grid-cols-10 gap-8 min-h-[calc(100vh-8rem)]">
          {/* Left Sidebar Filters - 30% */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow p-4 sticky top-24">
              <h3 className="font-medium text-lg mb-4">Filters</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {filterOptions.locations.map(location => (
                      <label key={location} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filters.location?.split(',').includes(location)}
                          onChange={(e) => {
                            const currentLocations = filters.location?.split(',').filter(Boolean) || [];
                            const updatedLocations = e.target.checked
                              ? [...currentLocations, location]
                              : currentLocations.filter(loc => loc !== location);
                            handleFilterChange('location', updatedLocations.join(',') || 'all');
                          }}
                          className="text-primary focus:ring-primary rounded"
                        />
                        <span className="text-sm">{location}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialization
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {filterOptions.specializations.map(spec => (
                      <label key={spec} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filters.specialization?.split(',').includes(spec)}
                          onChange={(e) => {
                            const currentSpecs = filters.specialization?.split(',').filter(Boolean) || [];
                            const updatedSpecs = e.target.checked
                              ? [...currentSpecs, spec]
                              : currentSpecs.filter(s => s !== spec);
                            handleFilterChange('specialization', updatedSpecs.join(',') || 'all');
                          }}
                          className="text-primary focus:ring-primary rounded"
                        />
                        <span className="text-sm">{spec}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Fee
                  </label>
                  <div className="space-y-2">
                    {['200', '300', '400', '500'].map(fee => (
                      <label key={fee} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filters.maxFee?.split(',').includes(fee)}
                          onChange={(e) => {
                            const currentFees = filters.maxFee?.split(',').filter(Boolean) || [];
                            const updatedFees = e.target.checked
                              ? [...currentFees, fee]
                              : currentFees.filter(f => f !== fee);
                            handleFilterChange('maxFee', updatedFees.join(',') || 'all');
                          }}
                          className="text-primary focus:ring-primary rounded"
                        />
                        <span className="text-sm">Up to ${fee}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {filterOptions.languages.map(lang => (
                      <label key={lang} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filters.language?.split(',').includes(lang)}
                          onChange={(e) => {
                            const currentLangs = filters.language?.split(',').filter(Boolean) || [];
                            const updatedLangs = e.target.checked
                              ? [...currentLangs, lang]
                              : currentLangs.filter(l => l !== lang);
                            handleFilterChange('language', updatedLangs.join(',') || 'all');
                          }}
                          className="text-primary focus:ring-primary rounded"
                        />
                        <span className="text-sm">{lang}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Area - 70% */}
          <div className="col-span-7 flex flex-col min-h-full">
            {/* Active Filters - Fixed under search */}
            {hasActiveFilters && (
              <div className="bg-white rounded-lg shadow-sm p-4 mb-4 sticky top-24 z-19">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-gray-500">Active filters:</span>
                  {Object.entries(filters).map(([key, value]) => (
                    value && value !== 'all' && (
                      <div
                        key={key}
                        className="inline-flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm"
                      >
                        <span className="text-gray-600 capitalize">
                          {key}: {String(value).split(',').join(', ')}
                        </span>
                        <button
                          onClick={() => removeFilter(key as keyof Filters)}
                          className="ml-2 text-gray-500 hover:text-gray-700"
                        >
                          ×
                        </button>
                      </div>
                    )
                  ))}
                  <button
                    onClick={() => setFilters({})}
                    className="text-primary hover:text-primary-dark text-sm ml-auto"
                  >
                    Clear all filters
                  </button>
                </div>
              </div>
            )}

            {/* Scrollable Results */}
            <div className="overflow-y-auto flex-1 min-h-[500px]">
              {loading ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                    <div className="space-y-3 mt-4">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                    </div>
                  </div>
                  <p className="text-gray-500 mt-4">Loading results...</p>
                </div>
              ) : (
                <>
                  {lawyers.length > 0 ? (
                    <div className="space-y-4">
                      {lawyers.map(lawyer => (
                        <div key={lawyer.id} className="bg-white rounded-lg shadow">
                          <LawyerCard
                            id={lawyer.id}
                            name={lawyer.name}
                            specialization={lawyer.specialization}
                            experienceYears={lawyer.experienceYears}
                            rating={lawyer.rating}
                            fee={lawyer.fee}
                            location={lawyer.location}
                            languages={lawyer.languages || []}
                            avatar={lawyer.avatar}
                            onView={() => navigate(`/app/lawyers/${lawyer.id}`)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                      <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No lawyers found</h3>
                      <p className="text-gray-500">
                        Try adjusting your filters or search criteria to find more results.
                      </p>
                    </div>
                  )}

                  {/* Pagination */}
                  {total > limit && (
                    <div className="flex justify-center gap-2 my-8">
                      <Button
                        onClick={() => setPage(prev => {
                          const next = Math.max(1, prev - 1)
                          load(next)
                          return next
                        })}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <span className="py-2 px-4">
                        Page {page} of {Math.max(1, Math.ceil(total / limit))}
                      </span>
                      <Button
                        onClick={() => setPage(prev => {
                          const next = Math.min(Math.max(1, Math.ceil(total / limit)), prev + 1)
                          load(next)
                          return next
                        })}
                        disabled={page === Math.max(1, Math.ceil(total / limit))}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SearchPage