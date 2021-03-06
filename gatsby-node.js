const { resolve, join } = require('path')
const { execSync } = require('child_process')
const { createFilePath } = require('gatsby-source-filesystem')
const { fmImagesToRelative } = require('gatsby-remark-relative-images')

// exports.onCreateWebpackConfig = ({ actions }) => {
//   const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
//   actions.setWebpackConfig({
//     plugins: [new BundleAnalyzerPlugin()],
//   })
// }

// Inlined version of subfont
// (https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-plugin-subfont)
exports.onPostBuild = ({ store }) => {
  const root = join(store.getState().program.directory, `public`)

  execSync(`npx subfont -i --no-recursive --inline-css --root ${root}`)
}

exports.createPages = async ({ actions, graphql }) => {
  const { createPage } = actions
  const caseTemplate = resolve('src/templates/case.js')
  const articleTemplate = resolve('src/templates/article.js')

  const allMarkdown = await graphql(`
    {
      allMarkdownRemark(
        limit: 1000
        sort: { order: DESC, fields: [frontmatter___date] }
      ) {
        edges {
          node {
            fields {
              slug
              redirect
            }
            frontmatter {
              title
              client
            }
          }
        }
      }
    }
  `)

  if (allMarkdown.errors) {
    throw Error(allMarkdown.errors)
  }

  const { edges } = allMarkdown.data.allMarkdownRemark

  // Case
  const cases = edges.filter(({ node }) =>
    node.fields.slug.startsWith('/case/'),
  )
  cases.forEach(({ node }, index) => {
    const { node: next } =
      index === cases.length - 1 ? cases[0] : cases[index + 1]

    createPage({
      path: node.fields.slug,
      component: caseTemplate,
      context: {
        slug: node.fields.slug,
        next,
      },
    })
  })

  // News
  const articles = edges.filter(({ node }) =>
    node.fields.slug.startsWith('/aktuellt/'),
  )
  articles.forEach(({ node }, index) => {
    const { node: next } =
      index === articles.length - 1 ? articles[0] : articles[index + 1]

    createPage({
      path: node.fields.slug,
      component: articleTemplate,
      context: {
        slug: node.fields.slug,
        next,
      },
    })
  })

  // Redirects
  edges.forEach((edge) => {
    const { redirect } = edge.node.fields
    if (redirect) {
      console.log('redirect')
    }
  })
}

function buildRedirectString(permalink, redirectFrom) {
  if (!permalink || !permalink.endsWith('.html')) {
    return redirectFrom ? JSON.stringify(redirectFrom) : ''
  }

  const basePath = permalink.slice(0, -'.html'.length)
  let redirects = [basePath, `${basePath}/`]
  if (Array.isArray(redirectFrom)) {
    redirects = redirects.concat(redirectFrom)
  }

  return JSON.stringify(redirects)
}

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions
  fmImagesToRelative(node)

  if (node.internal.type === 'MarkdownRemark') {
    const { redirect_from } = node.frontmatter // eslint-disable-line camelcase
    const slug = createFilePath({ node, getNode })

    createNodeField({
      node,
      name: 'slug',
      value: slug,
    })

    createNodeField({
      node,
      name: 'redirect',
      value: buildRedirectString(slug, redirect_from),
    })
  }
}
