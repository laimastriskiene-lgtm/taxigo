import fs from 'node:fs'
import vm from 'node:vm'

export function loadFunctions(path, expression, context = {}) {
  const source = fs.readFileSync(path, 'utf8')
    .replace(/^import .*$/gm, '')
    .replace(/\bexport\s+(?=(?:async\s+)?function)/g, '')
    .replaceAll('import.meta.env.VITE_GEOAPIFY_API_KEY', 'testKey')
  return vm.runInNewContext(source + '\n' + expression, context)
}

// Runs hook state and effect lifecycles without a browser or external services.
export function hookHarness(factory, globals = {}) {
  const cells = []
  let index = 0, jobs = [], changed = false
  const hooks = {
    useState(initial) {
      const at = index++
      if (!(at in cells)) cells[at] = typeof initial === 'function' ? initial() : initial
      return [cells[at], value => {
        const next = typeof value === 'function' ? value(cells[at]) : value
        if (!Object.is(next, cells[at])) { cells[at] = next; changed = true }
      }]
    },
    useRef(initial) {
      const at = index++
      if (!(at in cells)) cells[at] = { current: initial }
      return cells[at]
    },
    useEffect(effect, deps) {
      const at = index++, old = cells[at]
      if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) {
        cells[at] = { deps, cleanup: old?.cleanup }
        jobs.push(() => { cells[at].cleanup?.(); cells[at].cleanup = effect() })
      }
    },
  }
  const render = factory({ ...globals, ...hooks })
  const runner = {
    value: null,
    render() {
      index = 0; jobs = []; changed = false
      runner.value = render()
      for (const job of jobs) job()
      return runner.value
    },
    async flush() {
      for (let i = 0; i < 30; i++) {
        await Promise.resolve()
        if (changed) runner.render()
      }
      return runner.value
    },
    unmount() { for (const cell of cells) cell?.cleanup?.() },
  }
  runner.render()
  return runner
}
