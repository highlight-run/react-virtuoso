import * as u from '@virtuoso.dev/urx'
import { findMaxKeyValue } from './AATree'
import { domIOSystem } from './domIOSystem'
import { offsetOf, originalIndexFromLocation, sizeSystem } from './sizeSystem'
import { loggerSystem } from './loggerSystem'
import { scrollToIndexSystem } from './scrollToIndexSystem'
import { listStateSystem } from './listStateSystem'
import { ScrollIntoViewLocation } from './interfaces'

export const scrollIntoViewSystem = u.system(
  ([{ sizes, totalCount }, { scrollTop, viewportHeight, headerHeight, scrollingInProgress }, { scrollToIndex }]) => {
    const scrollIntoView = u.stream<ScrollIntoViewLocation>()

    u.connect(
      u.pipe(
        scrollIntoView,
        u.withLatestFrom(sizes, viewportHeight, totalCount, headerHeight, scrollTop),
        u.map(([viewLocation, sizes, viewportHeight, totalCount, headerHeight, scrollTop]) => {
          const { done, behavior, ...rest } = viewLocation
          let location = null
          const actualIndex = originalIndexFromLocation(viewLocation, sizes, totalCount - 1)

          const itemTop = offsetOf(actualIndex, sizes.offsetTree) + headerHeight
          if (itemTop < scrollTop) {
            location = { ...rest, behavior, align: 'start' }
          } else {
            const itemBottom = itemTop + findMaxKeyValue(sizes.sizeTree, actualIndex)[1]!

            if (itemBottom > scrollTop + viewportHeight) {
              location = { ...rest, behavior, align: 'end' }
            }
          }

          if (location) {
            done &&
              u.handleNext(
                u.pipe(
                  scrollingInProgress,
                  u.skip(1),
                  u.filter((value) => value === false)
                ),
                done
              )
          } else {
            done && done()
          }

          return location
        }),
        u.filter((value) => value !== null)
      ),
      scrollToIndex
    )

    return {
      scrollIntoView,
    }
  },
  u.tup(sizeSystem, domIOSystem, scrollToIndexSystem, listStateSystem, loggerSystem),
  { singleton: true }
)
