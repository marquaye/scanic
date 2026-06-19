import DefaultTheme from 'vitepress/theme'
import Playground from './Playground.vue'
import './custom.css'

// https://vitepress.dev/guide/custom-theme
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Globally available in any markdown page as <Playground />
    app.component('Playground', Playground)
  }
}
